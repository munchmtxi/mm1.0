'use strict';

/**
 * customerAnalyticsService.js
 * Manages customer analytics for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const {
  Customer,
  CustomerBehavior,
  Order,
  InDiningOrder,
  Booking,
  Notification,
  GamificationPoints,
  AuditLog,
  MenuInventory,
  ProductCategory,
} = require('@models');

/**
 * Monitors customer order and booking patterns.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Behavior patterns.
 */
async function trackCustomerBehavior(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const [behavior, orders, inDiningOrders, bookings] = await Promise.all([
      CustomerBehavior.findOne({ where: { user_id: customer.user_id } }),
      Order.count({ where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } }),
      InDiningOrder.count({ where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } }),
      Booking.count({ where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) } } }),
    ]);

    const updatedBehavior = await CustomerBehavior.upsert({
      user_id: customer.user_id,
      bookingFrequency: bookings,
      orderFrequency: orders + inDiningOrders,
      rideFrequency: behavior?.rideFrequency || 0,
      lastUpdated: new Date(),
    }, { returning: true });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_customer_behavior',
      details: { customerId, orders: orders + inDiningOrders, bookings },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:behaviorTracked', {
      customerId,
      behavior: { orders: orders + inDiningOrders, bookings },
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'customer_behavior_tracked',
      messageKey: 'analytics.customer_behavior_tracked',
      messageParams: { orderCount: orders + inDiningOrders },
      role: 'customer',
      module: 'analytics',
      languageCode: customer.preferred_language || 'en',
    });

    return updatedBehavior[0];
  } catch (error) {
    logger.error('Error tracking customer behavior', { error: error.message });
    throw error;
  }
}

/**
 * Identifies customer spending habits.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Spending trends.
 */
async function analyzeSpendingTrends(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const [orders, inDiningOrders] = await Promise.all([
      Order.findAll({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        attributes: ['total_amount', 'created_at', 'items'],
      }),
      InDiningOrder.findAll({
        where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
        attributes: ['total_amount', 'created_at'],
      }),
    ]);

    const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0) +
                      inDiningOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const avgOrderValue = (orders.length + inDiningOrders.length) ? (totalSpent / (orders.length + inDiningOrders.length)).toFixed(2) : 0;
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

    const trends = {
      totalSpent,
      averageOrderValue: avgOrderValue,
      orderCount: orders.length + inDiningOrders.length,
      topItems,
    };

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'analyze_spending_trends',
      details: { customerId, totalSpent, orderCount: orders.length + inDiningOrders.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:spendingTrendsAnalyzed', {
      customerId,
      totalSpent,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'spending_trends_analyzed',
      messageKey: 'analytics.spending_trends_analyzed',
      messageParams: { totalSpent },
      role: 'customer',
      module: 'analytics',
      languageCode: customer.preferred_language || 'en',
    });

    return trends;
  } catch (error) {
    logger.error('Error analyzing spending trends', { error: error.message });
    throw error;
  }
}

/**
 * Offers personalized item recommendations.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Recommendations.
 */
async function provideRecommendations(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const orders = await Order.findAll({
      where: { customer_id: customerId, created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 3)) } },
      include: [{ model: MenuInventory, as: 'orderedItems', include: [{ model: ProductCategory, as: 'category' }] }],
    });

    const categoryCounts = orders
      .flatMap((o) => o.orderedItems)
      .reduce((acc, item) => {
        if (item.category) {
          acc[item.category.name] = (acc[item.category.name] || 0) + 1;
        }
        return acc;
      }, {});

    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const recommendations = topCategory
      ? await MenuInventory.findAll({
          where: { category_id: (await ProductCategory.findOne({ where: { name: topCategory } }))?.id },
          limit: 5,
          attributes: ['id', 'name', 'price', 'description'],
        })
      : [];

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'provide_recommendations',
      details: { customerId, recommendationCount: recommendations.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:recommendationsProvided', {
      customerId,
      recommendationCount: recommendations.length,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'recommendations_provided',
      messageKey: 'analytics.recommendations_provided',
      messageParams: { itemCount: recommendations.length },
      role: 'customer',
      module: 'analytics',
      languageCode: customer.preferred_language || 'en',
    });

    return recommendations;
  } catch (error) {
    logger.error('Error providing recommendations', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for dashboard analytics engagement.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackAnalyticsGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const points = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: 'analytics_dashboard_engagement',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_analytics_gamification',
      details: { customerId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:pointsAwarded', {
      customerId,
      points: points.points,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'analytics_points_awarded',
      messageKey: 'analytics.analytics_points_awarded',
      messageParams: { points: points.points },
      role: 'customer',
      module: 'analytics',
      languageCode: customer.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking analytics gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  trackCustomerBehavior,
  analyzeSpendingTrends,
  provideRecommendations,
  trackAnalyticsGamification,
};