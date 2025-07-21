'use strict';

const {
  Sequelize,
  User,
  Customer,
  Booking,
  Order,
  InDiningOrder,
  Ride,
  Subscription,
  Payment,
  Feedback,
  PromotionRedemption,
  CustomerBehavior,
  ProductRecommendationAnalytics,
  ParkingBooking,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const customerConstants = require('@constants/customer/customerConstants');

const trackCustomerBehavior = async ({ customerId, transaction }) => {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });

  if (!customer) {
    throw new Error(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [bookings, orders, inDiningOrders, rides, parkingBookings] = await Promise.all([
    Booking.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES },
      },
      transaction,
    }),
    Order.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES },
      },
      transaction,
    }),
    InDiningOrder.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: customerConstants.MTABLES_CONSTANTS.ORDER_STATUSES },
      },
      transaction,
    }),
    Ride.count({
      where: {
        customerId: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: customerConstants.MTXI_CONSTANTS.RIDE_STATUSES },
      },
      transaction,
    }),
    ParkingBooking.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: customerConstants.MPARK_CONSTANTS.PARKING_STATUSES },
      },
      transaction,
    }),
  ]);

  const behavior = {
    bookingFrequency: bookings,
    orderFrequency: orders + inDiningOrders,
    rideFrequency: rides,
    parkingFrequency: parkingBookings,
    lastUpdated: new Date(),
  };

  await CustomerBehavior.upsert({
    user_id: customerId,
    bookingFrequency: bookings,
    orderFrequency: orders + inDiningOrders,
    rideFrequency: rides,
    parkingFrequency: parkingBookings,
    lastUpdated: new Date(),
  }, { transaction });

  return { customer, behavior };
};

const analyzeSpendingTrends = async ({ customerId, transaction }) => {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });

  if (!customer) {
    throw new Error(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const payments = await Payment.findAll({
    where: {
      customer_id: customer.id,
      status: customerConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // 'completed'
      created_at: { [Sequelize.Op.gte]: ninetyDaysAgo },
    },
    attributes: [
      [Sequelize.fn('SUM', Sequelize.col('amount')), 'totalSpent'],
      [Sequelize.fn('COUNT', Sequelize.col('id')), 'transactionCount'],
      [Sequelize.fn('AVG', Sequelize.col('amount')), 'averageTransaction'],
    ],
    transaction,
  });

  const subscriptions = await Subscription.count({
    where: {
      customer_id: customer.id,
      status: customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0], // 'active'
      created_at: { [Sequelize.Op.gte]: ninetyDaysAgo },
    },
    transaction,
  });

  const promotions = await PromotionRedemption.count({
    where: {
      customer_id: customer.id,
      redeemed_at: { [Sequelize.Op.gte]: ninetyDaysAgo },
    },
    transaction,
  });

  const trends = {
    totalSpent: parseFloat(payments[0]?.dataValues.totalSpent || 0).toFixed(2),
    transactionCount: payments[0]?.dataValues.transactionCount || 0,
    averageTransaction: parseFloat(payments[0]?.dataValues.averageTransaction || 0).toFixed(2),
    activeSubscriptions: subscriptions,
    promotionRedemptions: promotions,
    currency: customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes('munch')
      ? munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY
      : customerConstants.WALLET_CONSTANTS.SUPPORTED_CURRENCIES[0], // Fallback to first supported currency
    period: customerConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS[2], // 'monthly'
  };

  return { customer, trends };
};

const provideRecommendations = async ({ customerId, transaction }) => {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });

  if (!customer) {
    throw new Error(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const preferences = customer.preferences || {};
  const dietaryFilters = preferences.dietary || [];

  const recommendations = await ProductRecommendationAnalytics.findAll({
    where: {
      customer_id: customer.id,
      recommendation_type: {
        [Sequelize.Op.in]: customerConstants.ANALYTICS_CONSTANTS.RECOMMENDATION_CATEGORIES,
      },
    },
    limit: 5,
    order: [['created_at', 'DESC']],
    transaction,
  });

  const feedback = await Feedback.findAll({
    where: { customer_id: customerId },
    attributes: ['rating', 'comment'],
    limit: 10,
    transaction,
  });

  const filteredRecommendations = recommendations.filter((rec) =>
    dietaryFilters.length === 0 ||
    dietaryFilters.every((filter) =>
      customerConstants.ACCESSIBILITY_CONSTANTS.ALLOWED_DIETARY_FILTERS.includes(filter) &&
      rec.metadata?.dietary?.includes(filter)
    )
  );

  const recommendationData = {
    items: filteredRecommendations.map((rec) => ({
      productId: rec.product_id,
      recommendationType: rec.recommendation_type,
      eventType: rec.event_type,
      metadata: rec.metadata,
    })),
    feedbackSummary: feedback.reduce(
      (acc, fb) => {
        acc.ratingTotal = (acc.ratingTotal || 0) + fb.rating;
        acc.feedbackCount = (acc.feedbackCount || 0) + 1;
        return acc;
      },
      { ratingTotal: 0, feedbackCount: 0 }
    ),
  };

  return { customer, recommendationData, recommendationCount: filteredRecommendations.length };
};

const trackParkingBehavior = async ({ customerId, transaction }) => {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });

  if (!customer) {
    throw new Error(customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const parkingBookings = await ParkingBooking.count({
    where: {
      customer_id: customer.id,
      created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
      status: { [Sequelize.Op.in]: customerConstants.MPARK_CONSTANTS.PARKING_STATUSES },
    },
    transaction,
  });

  const behavior = {
    parkingFrequency: parkingBookings,
    preferredSpaceTypes: await ParkingBooking.findAll({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: customerConstants.MPARK_CONSTANTS.PARKING_STATUSES[1], // 'confirmed'
      },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('booking_type')), 'count'],
        'booking_type',
      ],
      group: ['booking_type'],
      transaction,
    }).then((results) =>
      results.map((r) => ({
        type: r.booking_type,
        count: r.dataValues.count,
      }))
    ),
    lastUpdated: new Date(),
  };

  await CustomerBehavior.upsert({
    user_id: customerId,
    parkingFrequency: parkingBookings,
    preferredSpaceTypes: behavior.preferredSpaceTypes,
    lastUpdated: new Date(),
  }, { transaction });

  return { customer, behavior };
};

module.exports = {
  trackCustomerBehavior,
  analyzeSpendingTrends,
  provideRecommendations,
  trackParkingBehavior,
};