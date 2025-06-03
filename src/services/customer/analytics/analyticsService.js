'use strict';

const { Sequelize, User, Customer, Booking, Order, InDiningOrder, Ride, Subscription, Payment, ProductRecommendationAnalytics, Feedback, PromotionRedemption, CustomerBehavior } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const rideConstants = require('@constants/common/rideConstants');
const customerConstants = require('@constants/customer/customerConstants');

const trackCustomerBehavior = async ({ customerId, transaction }) => {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [bookings, orders, in_dining_orders, rides] = await Promise.all([
    Booking.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: mtablesConstants.BOOKING_STATUSES },
      },
      transaction,
    }),
    Order.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES },
      },
      transaction,
    }),
    InDiningOrder.count({
      where: {
        customer_id: customer.id,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: mtablesConstants.IN_DINING_STATUSES },
      },
      transaction,
    }),
    Ride.count({
      where: {
        customerId: customerId,
        created_at: { [Sequelize.Op.gte]: thirtyDaysAgo },
        status: { [Sequelize.Op.in]: rideConstants.RIDE_STATUSES },
      },
      transaction,
    }),
  ]);

  const behavior = {
    bookingFrequency: bookings,
    orderFrequency: orders + in_dining_orders,
    rideFrequency: rides,
    lastUpdated: new Date(),
  };

  await CustomerBehavior.upsert({
    user_id: customerId,
    bookingFrequency: bookings,
    orderFrequency: orders + in_dining_orders,
    rideFrequency: rides,
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
    throw new Error('Customer not found');
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const payments = await Payment.findAll({
    where: {
      customer_id: customer.id,
      status: 'completed',
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
      status: 'active',
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
    currency: customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
    period: 'last 90 days',
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
    throw new Error('Customer not found');
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
    where: { user_id: customerId },
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

module.exports = {
  trackCustomerBehavior,
  analyzeSpendingTrends,
  provideRecommendations,
};