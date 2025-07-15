'use strict';

const { Op } = require('sequelize');
const { Customer, CustomerBehavior, Booking, InDiningOrder, Order, Merchant, Promotion, MerchantBranch, ParkingBooking } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logging');

async function segmentCustomers(merchantId, criteria, ipAddress, transaction = null) {
  try {
    if (!merchantId || !criteria?.orderFrequency || !criteria?.bookingFrequency || !criteria?.spending || !criteria?.rideFrequency) {
      throw new AppError('Invalid criteria provided', 400, customerConstants.ERROR_CODES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }

    const merchant = await Merchant.findByPk(merchantId, { 
      attributes: ['id', 'user_id', 'preferred_language'], 
      transaction 
    });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, customerConstants.ERROR_CODES.includes('CUSTOMER_NOT_FOUND') ? 'CUSTOMER_NOT_FOUND' : merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const { orderFrequency, bookingFrequency, spending, rideFrequency } = criteria;
    const conditions = {};
    if (orderFrequency) conditions.orderFrequency = { [Op.gte]: orderFrequency };
    if (bookingFrequency) conditions.bookingFrequency = { [Op.gte]: bookingFrequency };

    const customers = await Customer.findAll({
      attributes: ['id'],
      include: [
        { 
          model: CustomerBehavior, 
          where: conditions, 
          attributes: ['orderFrequency', 'bookingFrequency', 'rideFrequency'] 
        },
        { 
          model: Order, 
          where: { 
            merchant_id: merchantId, 
            status: { [Op.in]: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES } 
          }, 
          attributes: ['total_amount'] 
        },
        { 
          model: InDiningOrder, 
          where: { 
            branch_id: { [Op.in]: (await MerchantBranch.findAll({ where: { merchant_id: merchantId }, attributes: ['id'], transaction })).map(b => b.id) },
            status: { [Op.in]: mtablesConstants.IN_DINING_STATUSES }
          }, 
          attributes: ['total_amount'] 
        },
        { 
          model: ParkingBooking, 
          where: { 
            merchant_id: merchantId, 
            status: { [Op.in]: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES } 
          }, 
          attributes: [] 
        },
      ],
      transaction,
    });

    const segments = {
      highValue: [],
      frequent: [],
      occasional: [],
    };

    for (const customer of customers) {
      const orders = [...customer.orders, ...customer.inDiningOrders];
      const totalSpending = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
      const orderCount = orders.length;
      const bookingCount = await Booking.count({ 
        where: { 
          customer_id: customer.id, 
          merchant_id: merchantId, 
          status: { [Op.in]: mtablesConstants.BOOKING_STATUSES } 
        }, 
        transaction 
      }) || 0;
      const parkingBookingCount = await ParkingBooking.count({ 
        where: { 
          customer_id: customer.id, 
          merchant_id: merchantId, 
          status: { [Op.in]: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES } 
        }, 
        transaction 
      }) || 0;
      const rideCount = await CustomerBehavior.findOne({ 
        where: { customer_id: customer.id }, 
        attributes: ['rideFrequency'], 
        transaction 
      })?.rideFrequency || 0;

      if (spending && totalSpending >= spending.high) {
        segments.highValue.push({ customerId: customer.id, totalSpending, orderCount, bookingCount, parkingBookingCount, rideCount });
      } else if (
        orderCount >= (orderFrequency?.frequent || 0) || 
        bookingCount >= (bookingFrequency?.frequent || 0) || 
        parkingBookingCount >= (bookingFrequency?.frequent || 0) || 
        rideCount >= (rideFrequency?.frequent || 0)
      ) {
        segments.frequent.push({ customerId: customer.id, totalSpending, orderCount, bookingCount, parkingBookingCount, rideCount });
      } else {
        segments.occasional.push({ customerId: customer.id, totalSpending, orderCount, bookingCount, parkingBookingCount, rideCount });
      }
    }

    logger.info(`Customers segmented for merchant ${merchantId}: ${JSON.stringify({ highValue: segments.highValue.length, frequent: segments.frequent.length, occasional: segments.occasional.length })}`);
    return {
      merchantId,
      segments,
      segmentCounts: { highValue: segments.highValue.length, frequent: segments.frequent.length, occasional: segments.occasional.length },
      language: merchant.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: customerConstants.SUCCESS_MESSAGES.includes('profile_updated') ? 'profile_updated' : 'customersSegmented',
    };
  } catch (error) {
    throw handleServiceError('segmentCustomers', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function analyzeBehavior(merchantId, customerId, ipAddress, transaction = null) {
  try {
    if (!merchantId || !customerId) {
      throw new AppError('Invalid input provided', 400, customerConstants.ERROR_CODES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, customerConstants.ERROR_CODES.includes('CUSTOMER_NOT_FOUND') ? 'CUSTOMER_NOT_FOUND' : merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const customer = await Customer.findByPk(customerId, { 
      attributes: ['id', 'preferred_language', 'updated_at'],
      include: [{ model: CustomerBehavior, attributes: ['orderFrequency', 'bookingFrequency', 'rideFrequency', 'lastUpdated'] }],
      transaction,
    });
    if (!customer) {
      throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }

    const orders = await Order.findAll({ 
      where: { 
        customer_id: customerId, 
        merchant_id: merchantId, 
        status: { [Op.in]: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES } 
      }, 
      attributes: ['total_amount'], 
      transaction,
    });
    const inDiningOrders = await InDiningOrder.findAll({
      where: { 
        customer_id: customerId, 
        branch_id: { [Op.in]: (await MerchantBranch.findAll({ where: { merchant_id: merchantId }, attributes: ['id'], transaction })).map(b => b.id) },
        status: { [Op.in]: mtablesConstants.IN_DINING_STATUSES }
      },
      attributes: ['total_amount'],
      transaction,
    });
    const bookings = await Booking.findAll({ 
      where: { 
        customer_id: customerId, 
        merchant_id: merchantId, 
        status: { [Op.in]: mtablesConstants.BOOKING_STATUSES } 
      }, 
      attributes: ['booking_type'], 
      transaction,
    });
    const parkingBookings = await ParkingBooking.findAll({
      where: { 
        customer_id: customerId, 
        merchant_id: merchantId, 
        status: { [Op.in]: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES } 
      },
      attributes: ['booking_type'],
      transaction,
    });

    const totalSpending = [...orders, ...inDiningOrders].reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const trends = {
      orderFrequency: customer.customerBehavior?.orderFrequency || 0,
      bookingFrequency: customer.customerBehavior?.bookingFrequency || 0,
      parkingBookingFrequency: parkingBookings.length || 0,
      rideFrequency: customer.customerBehavior?.rideFrequency || 0,
      totalSpending,
      averageOrderValue: (orders.length + inDiningOrders.length) > 0 ? totalSpending / (orders.length + inDiningOrders.length) : 0,
      preferredBookingType: bookings.length > 0 ? bookings[0].booking_type : (parkingBookings.length > 0 ? parkingBookings[0].booking_type : null),
      lastActivity: customer.customerBehavior?.lastUpdated || customer.updated_at,
    };

    logger.info(`Behavior analyzed for customer ${customerId} by merchant ${merchantId}`);
    return {
      merchantId,
      customerId,
      trends,
      language: customer.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: customerConstants.SUCCESS_MESSAGES.includes('profile_updated') ? 'profile_updated' : 'behaviorAnalyzed',
    };
  } catch (error) {
    throw handleServiceError('analyzeBehavior', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function targetOffers(merchantId, segmentId, ipAddress, transaction = null) {
  try {
    if (!merchantId || !segmentId) {
      throw new AppError('Invalid input provided', 400, customerConstants.ERROR_CODES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, customerConstants.ERROR_CODES.includes('CUSTOMER_NOT_FOUND') ? 'CUSTOMER_NOT_FOUND' : merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const validSegments = ['highValue', 'frequent', 'occasional'];
    if (!validSegments.includes(segmentId)) {
      throw new AppError('Invalid segment provided', 400, customerConstants.ERROR_CODES.includes('INVALID_INPUT') ? 'INVALID_INPUT' : merchantConstants.ERROR_CODES.SYSTEM_ERROR);
    }

    const offerDetails = {
      highValue: { 
        discount_percentage: 20, 
        reward_amount: 0, 
        type: munchConstants.PROMOTION_TYPES.includes('percentage') ? 'percentage' : 'DISCOUNT', 
        service_type: 'all', 
        is_reusable: false, 
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
      },
      frequent: { 
        discount_percentage: 10, 
        reward_amount: 0, 
        type: munchConstants.PROMOTION_TYPES.includes('percentage') ? 'percentage' : 'DISCOUNT', 
        service_type: 'all', 
        is_reusable: false, 
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
      },
      occasional: { 
        discount_percentage: 0, 
        reward_amount: 5, 
        type: munchConstants.PROMOTION_TYPES.includes('loyalty') ? 'loyalty' : 'CASHBACK', 
        service_type: 'all', 
        is_reusable: true, 
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
      },
    }[segmentId];

    const promotion = await Promotion.create({
      merchant_id: merchantId,
      criteria: { segment: segmentId },
      ...offerDetails,
      is_active: true,
      created_at: new Date(),
    }, { transaction });

    logger.info(`Offers targeted for segment ${segmentId} by merchant ${merchantId}`);
    return {
      merchantId,
      segmentId,
      promotionId: promotion.id,
      language: merchant.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: munchConstants.SUCCESS_MESSAGES.includes('Promotion created') ? 'Promotion created' : 'offersTargeted',
    };
  } catch (error) {
    throw handleServiceError('targetOffers', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = {
  segmentCustomers,
  analyzeBehavior,
  targetOffers,
};