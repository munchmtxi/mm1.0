'use strict';

const { Op } = require('sequelize');
const { Customer, CustomerBehavior, Order, InDiningOrder, Booking, MenuInventory, ProductCategory, ParkingBooking } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function trackCustomerBehavior(customerId, ipAddress, transaction = null) {
  try {
    if (!customerId) {
      throw new AppError(customerConstants.ERROR_CODES.INVALID_CUSTOMER, 400);
    }

    const customer = await Customer.findByPk(customerId, { attributes: ['user_id', 'preferred_language'], transaction });
    if (!customer) {
      throw new AppError(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND, 404);
    }

    const [behavior, orders, inDiningOrders, bookings, parkingBookings] = await Promise.all([
      CustomerBehavior.findOne({ where: { user_id: customer.user_id }, transaction }),
      Order.count({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        transaction,
      }),
      InDiningOrder.count({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        transaction,
      }),
      Booking.count({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        transaction,
      }),
      ParkingBooking.count({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } },
        transaction,
      }),
    ]);

    const [updatedBehavior] = await CustomerBehavior.upsert(
      {
        user_id: customer.user_id,
        bookingFrequency: bookings,
        orderFrequency: orders + inDiningOrders,
        rideFrequency: behavior?.rideFrequency || 0,
        parkingFrequency: parkingBookings,
        lastUpdated: new Date(),
      },
      { returning: true, transaction }
    );

    logger.info(`Customer behavior tracked for customer ${customerId}`);
    return {
      customerId,
      behavior: { orders: orders + inDiningOrders, bookings, rideFrequency: updatedBehavior.rideFrequency, parkingFrequency: updatedBehavior.parkingFrequency },
      language: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      action: customerConstants.ANALYTICS_CONSTANTS.AUDIT_TYPES.track_behavior,
    };
  } catch (error) {
    throw handleServiceError('trackCustomerBehavior', error, customerConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function analyzeSpendingTrends(customerId, ipAddress, transaction = null) {
  try {
    if (!customerId) {
      throw new AppError(customerConstants.ERROR_CODES.INVALID_CUSTOMER, 400);
    }

    const customer = await Customer.findByPk(customerId, { attributes: ['user_id', 'preferred_language'], transaction });
    if (!customer) {
      throw new AppError(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND, 404);
    }

    const [orders, inDiningOrders, parkingBookings] = await Promise.all([
      Order.findAll({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        attributes: ['total_amount', 'created_at', 'items'],
        transaction,
      }),
      InDiningOrder.findAll({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        attributes: ['total_amount', 'created_at'],
        transaction,
      }),
      ParkingBooking.findAll({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        attributes: ['start_time', 'end_time'],
        include: [{ model: Payment, as: 'payment', attributes: ['amount'] }],
        transaction,
      }),
    ]);

    const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) +
      inDiningOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) +
      parkingBookings.reduce((sum, b) => sum + (b.payment?.amount || 0), 0);
    const avgOrderValue = (orders.length + inDiningOrders.length + parkingBookings.length)
      ? (totalSpent / (orders.length + inDiningOrders.length + parkingBookings.length)).toFixed(2)
      : 0;
    const favoriteItems = orders
      .flatMap((o) => o.items)
      .reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
      }, {});
    const topItems = Object.entries(favoriteItems)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    logger.info(`Spending trends analyzed for customer ${customerId}`);
    return {
      customerId,
      trends: { totalSpent, averageOrderValue: avgOrderValue, orderCount: orders.length + inDiningOrders.length, parkingCount: parkingBookings.length, topItems },
      language: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      action: customerConstants.ANALYTICS_CONSTANTS.AUDIT_TYPES.analyze_spending,
    };
  } catch (error) {
    throw handleServiceError('analyzeSpendingTrends', error, customerConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function provideRecommendations(customerId, ipAddress, transaction = null) {
  try {
    if (!customerId) {
      throw new AppError(customerConstants.ERROR_CODES.INVALID_CUSTOMER, 400);
    }

    const customer = await Customer.findByPk(customerId, { attributes: ['user_id', 'preferred_language'], transaction });
    if (!customer) {
      throw new AppError(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND, 404);
    }

    const orders = await Order.findAll({
      where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      include: [{ model: MenuInventory, as: 'orderedItems', include: [{ model: ProductCategory, as: 'category' }] }],
      transaction,
    });

    const categoryCounts = orders
      .flatMap((o) => o.orderedItems)
      .reduce((acc, item) => {
        if (item.category) {
          acc[item.category.name] = (acc[item.category.name] || 0) + 1;
        }
        return acc;
      }, {});

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const previousCategory = orders[0]?.orderedItems[0]?.category?.name || topCategory;

    const recommendations = topCategory
      ? await MenuInventory.findAll({
          where: { category_id: (await ProductCategory.findOne({ where: { name: topCategory }, transaction }))?.id },
          limit: 5,
          attributes: ['id', 'name', 'price', 'description'],
          transaction,
        })
      : [];

    logger.info(`Recommendations provided for customer ${customerId}`);
    return {
      customerId,
      recommendations,
      language: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      action: customerConstants.ANALYTICS_CONSTANTS.AUDIT_TYPES.provide_recommendations,
      metadata: { topCategory, previousCategory },
    };
  } catch (error) {
    throw handleServiceError('provideRecommendations', error, customerConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { trackCustomerBehavior, analyzeSpendingTrends, provideRecommendations };