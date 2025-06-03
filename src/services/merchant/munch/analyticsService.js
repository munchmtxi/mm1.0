'use strict';

/**
 * analyticsService.js
 * Analyzes order trends, delivery performance, customer insights, and gamification for Munch merchant service.
 * Integrates socket, notification, point, audit, location, and localization services.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const locationService = require('@services/common/locationService');
const { formatMessage } = require('@utils/localization/localization');
const munchConstants = require('@constants/common/munchConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Order, Customer, Driver, GamificationPoints, MerchantBranch, Notification, AuditLog } = require('@models');

/**
 * Calculates time range for analytics.
 * @param {string} period - Report period (daily, weekly, monthly, yearly).
 * @returns {Object} Start and end dates.
 */
function getTimeRange(period) {
  const now = new Date();
  let start;

  switch (period) {
    case 'daily': start = new Date(now.setHours(0, 0, 0, 0)); break;
    case 'weekly': start = new Date(now.setDate(now.getDate() - now.getDay())).setHours(0, 0, 0, 0); break;
    case 'monthly': start = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'yearly': start = new Date(now.getFullYear(), 0, 1); break;
    default: throw new Error('Invalid period');
  }

  return { start, end: new Date() };
}

/**
 * Analyzes order patterns for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {string} period - Report period.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Order trends data.
 */
async function trackOrderTrends(restaurantId, period, io) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');
    if (!merchantConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) throw new Error('Invalid period');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch || !munchConstants.MUNCH_SETTINGS.SUPPORTED_CITIES[branch.countryCode]?.includes(branch.city)) {
      throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const timeRange = getTimeRange(period);
    const orders = await Order.findAll({
      where: { branch_id: restaurantId, created_at: { [Op.between]: [timeRange.start, timeRange.end] } },
      attributes: [
        'order_type',
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'order_count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_revenue'],
      ],
      group: ['order_type', 'status', sequelize.fn('DATE_TRUNC', period, sequelize.col('created_at'))],
    });

    const trends = {
      orderCount: orders.reduce((sum, order) => sum + order.dataValues.order_count, 0),
      revenue: orders.reduce((sum, order) => sum + (order.dataValues.total_revenue || 0), 0),
      byType: orders.reduce((acc, order) => ({ ...acc, [order.order_type]: (acc[order.order_type] || 0) + order.dataValues.order_count }), {}),
      byStatus: orders.reduce((acc, order) => ({ ...acc, [order.status]: (acc[order.status] || 0) + order.dataValues.order_count }), {}),
    };

    await auditService.logAction({ userId: 'system', role: 'merchant', action: 'track_order_trends', details: { restaurantId, period, trends }, ipAddress: '127.0.0.1' });
    socketService.emit(io, 'analytics:orderTrends', { restaurantId, period, trends }, `merchant:${restaurantId}`);

    return trends;
  } catch (error) {
    logger.error('Error tracking order trends', { error: error.message });
    throw error;
  }
}

/**
 * Monitors delivery performance for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {string} period - Report period.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Delivery performance metrics.
 */
async function monitorDeliveryPerformance(restaurantId, period, io) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');
    if (!merchantConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) throw new Error('Invalid period');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const timeRange = getTimeRange(period);
    const orders = await Order.findAll({
      where: { branch_id: restaurantId, driver_id: { [Op.ne]: null }, status: 'completed', created_at: { [Op.between]: [timeRange.start, timeRange.end] } },
      include: [{ model: Driver, as: 'driver' }],
      attributes: ['driver_id', 'estimated_delivery_time', 'actual_delivery_time', 'delivery_distance'],
    });

    const performance = orders.reduce(
      (acc, order) => {
        const est = order.estimated_delivery_time;
        const act = order.actual_delivery_time;
        if (est && act) {
          const diff = (act - est) / 1000 / 60;
          acc.totalDeliveries += 1;
          acc.avgDeliveryTime += diff;
          acc.onTime += diff <= 0 ? 1 : 0;
        }
        acc.totalDistance += order.delivery_distance || 0;
        return acc;
      },
      { totalDeliveries: 0, avgDeliveryTime: 0, onTime: 0, totalDistance: 0 }
    );

    const result = {
      totalDeliveries: performance.totalDeliveries,
      avgDeliveryTime: performance.totalDeliveries ? performance.avgDeliveryTime / performance.totalDeliveries : 0,
      onTimeRate: performance.totalDeliveries ? performance.onTime / performance.totalDeliveries : 0,
      avgDistance: performance.totalDeliveries ? performance.totalDistance / performance.totalDeliveries : 0,
    };

    await auditService.logAction({ userId: 'system', role: 'merchant', action: 'monitor_delivery_performance', details: { restaurantId, period, result }, ipAddress: '127.0.0.1' });
    socketService.emit(io, 'analytics:deliveryPerformance', { restaurantId, period, result }, `merchant:${restaurantId}`);

    if (result.onTimeRate > 0.9) {
      const drivers = [...new Set(orders.map(order => order.driver_id))];
      for (const driverId of drivers) {
        await pointService.awardPoints({ userId: driverId, role: 'driver', action: 'high_performance_delivery', languageCode: branch.preferred_language });
      }
    }

    return result;
  } catch (error) {
    logger.error('Error monitoring delivery performance', { error: error.message });
    throw error;
  }
}

/**
 * Aggregates customer insights for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {string} period - Report period.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Customer insights data.
 */
async function aggregateCustomerInsights(restaurantId, period, io) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');
    if (!merchantConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) throw new Error('Invalid period');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const timeRange = getTimeRange(period);
    const orders = await Order.findAll({
      where: { branch_id: restaurantId, created_at: { [Op.between]: [timeRange.start, timeRange.end] } },
      include: [{ model: Customer, as: 'customer' }],
      attributes: ['customer_id', 'total_amount', 'items', 'delivery_location'],
    });

    const insights = orders.reduce(
      (acc, order) => {
        acc.totalOrders += 1;
        acc.totalSpent += order.total_amount;
        acc.customers.add(order.customer_id);
        const items = order.items || [];
        items.forEach((item) => {
          acc.popularItems[item.name] = (acc.popularItems[item.name] || 0) + (item.quantity || 1);
        });
        if (order.delivery_location) acc.locations.add(JSON.stringify(order.delivery_location));
        return acc;
      },
      { totalOrders: 0, totalSpent: 0, customers: new Set(), popularItems: {}, locations: new Set() }
    );

    const result = {
      totalOrders: insights.totalOrders,
      avgOrderValue: insights.totalOrders ? insights.totalSpent / insights.totalOrders : 0,
      uniqueCustomers: insights.customers.size,
      popularItems: Object.entries(insights.popularItems).sort((a, b) => b[1] - a[1]).slice(0, 5).reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {}),
      uniqueLocations: insights.locations.size,
    };

    await auditService.logAction({ userId: 'system', role: 'merchant', action: 'aggregate_customer_insights', details: { restaurantId, period, result }, ipAddress: '127.0.0.1' });
    socketService.emit(io, 'analytics:customerInsights', { restaurantId, period, result }, `merchant:${restaurantId}`);

    if (result.uniqueCustomers > 100) {
      await notificationService.sendNotification({
        userId: branch.merchant_id,
        notificationType: 'merchant_analytics',
        messageKey: 'analytics.high_customer_engagement',
        messageParams: { count: result.uniqueCustomers },
        role: 'merchant',
        module: 'analytics',
        languageCode: branch.preferred_language,
      });
    }

    return result;
  } catch (error) {
    logger.error('Error aggregating customer insights', { error: error.message });
    throw error;
  }
}

/**
Truncated at the end. */
async function trackOrderGamification(restaurantId, period, io) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');
    if (!merchantConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) throw new Error('Invalid period');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const timeRange = getTimeRange(period);
    const points = await GamificationPoints.findAll({
      where: { created_at: { [Op.between]: [timeRange.start, timeRange.end] }, action: { [Op.in]: ['order_placed', 'order_completed'] } },
      include: [{ model: Order, as: 'order', where: { branch_id: restaurantId }, required: true }],
      attributes: ['user_id', 'points', 'action'],
    });

    const gamification = points.reduce(
      (acc, point) => {
        acc.totalPoints += point.points;
        acc.users.add(point.user_id);
        acc.actions[point.action] = (acc.actions[point.action] || 0) + point.points;
        return acc;
      },
      { totalPoints: 0, users: new Set(), actions: {} }
    );

    const result = {
      totalPoints: gamification.totalPoints,
      uniqueUsers: gamification.users.size,
      pointsByAction: gamification.actions,
    };

    await auditService.logAction({ userId: 'system', role: 'merchant', action: 'track_gamification', details: { restaurantId, period, result }, ipAddress: '127.0.0.1' });
    socketService.emit(io, 'analytics:gamification', { restaurantId, period, result }, `merchant:${restaurantId}`);

    return result;
  } catch (error) {
    logger.error('Error tracking gamification', { error: error.message });
    throw error;
  }
}

/**
 * Analyzes delivery locations for a restaurant.
 * @param {number} restaurantId - Merchant branch ID.
 * @param {string} period - Report period.
 * @returns {Promise<Object>} Location analytics data.
 */
async function analyzeDeliveryLocations(restaurantId, period) {
  try {
    if (!restaurantId) throw new Error('Restaurant ID required');
    if (!merchantConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) throw new Error('Invalid period');

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const timeRange = getTimeRange(period);
    const orders = await Order.findAll({
      where: { branch_id: restaurantId, delivery_location: { [Op.ne]: null }, created_at: { [Op.between]: [timeRange.start, timeRange.end] } },
      attributes: ['delivery_location'],
    });

    const locations = [];
    for (const order of orders) {
      const location = await locationService.resolveLocation(order.delivery_location);
      locations.push(location);
    }

    const result = {
      totalDeliveries: locations.length,
      uniqueCities: [...new Set(locations.map(loc => loc.city))].length,
      avgConfidenceLevel: locations.reduce((sum, loc) => sum + (loc.confidenceLevel === 'HIGH' ? 1 : loc.confidenceLevel === 'MEDIUM' ? 0.5 : 0), 0) / (locations.length || 1),
    };

    await auditService.logAction({ userId: 'system', role: 'merchant', action: 'analyze_delivery_locations', details: { restaurantId, period, result }, ipAddress: '127.0.0.1' });

    return result;
  } catch (error) {
    logger.error('Error analyzing delivery locations', { error: error.message });
    throw error;
  }
}

module.exports = {
  trackOrderTrends,
  monitorDeliveryPerformance,
  aggregateCustomerInsights,
  trackOrderGamification,
  analyzeDeliveryLocations,
};