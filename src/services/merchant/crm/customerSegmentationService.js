'use strict';

/**
 * customerSegmentationService.js
 * Manages customer segmentation, behavior analysis, targeted offers, and engagement gamification for Munch merchant service.
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
const { Customer, CustomerBehavior, Booking, InDiningOrder, Order, Merchant, Promotion, GamificationPoints, AuditLog, Notification } = require('@models');

/**
 * Groups customers by behavior criteria.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} criteria - Segmentation criteria (e.g., orderFrequency, bookingFrequency, spending).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Segments.
 */
async function segmentCustomers(merchantId, criteria, io) {
  try {
    if (!merchantId || !criteria) throw new Error('Merchant ID and criteria required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const { orderFrequency, bookingFrequency, spending } = criteria;
    const conditions = {};
    if (orderFrequency) conditions.orderFrequency = { [Op.gte]: orderFrequency };
    if (bookingFrequency) conditions.bookingFrequency = { [Op.gte]: bookingFrequency };

    const customers = await Customer.findAll({
      include: [
        { model: CustomerBehavior, where: conditions },
        { model: Order, where: { merchant_id: merchantId } },
        { model: InDiningOrder, where: { branch_id: { [Op.in]: (await merchant.getBranches()).map(b => b.id) } } },
      ],
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
      const bookingCount = (await Booking.count({ where: { customer_id: customer.id, merchant_id: merchantId } })) || 0;

      if (spending && totalSpending >= spending.high) {
        segments.highValue.push({ customerId: customer.id, totalSpending, orderCount, bookingCount });
      } else if (orderCount >= orderFrequency?.frequent || bookingCount >= bookingFrequency?.frequent) {
        segments.frequent.push({ customerId: customer.id, totalSpending, orderCount, bookingCount });
      } else {
        segments.occasional.push({ customerId: customer.id, totalSpending, orderCount, bookingCount });
      }
    }

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'segment_customers',
      details: { merchantId, criteria, segmentCounts: { highValue: segments.highValue.length, frequent: segments.frequent.length, occasional: segments.occasional.length } },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'crm:customersSegmented', {
      merchantId,
      segmentCounts: { highValue: segments.highValue.length, frequent: segments.frequent.length, occasional: segments.occasional.length },
    }, `merchant:${merchantId}`);

    return segments;
  } catch (error) {
    logger.error('Error segmenting customers', { error: error.message });
    throw error;
  }
}

/**
 * Identifies customer behavior trends.
 * @param {number} merchantId - Merchant ID.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Behavior trends.
 */
async function analyzeBehavior(merchantId, customerId, io) {
  try {
    if (!merchantId || !customerId) throw new Error('Merchant ID and customer ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const customer = await Customer.findByPk(customerId, { include: [CustomerBehavior] });
    if (!customer) throw new Error('Customer not found');

    const orders = await Order.findAll({ where: { customer_id: customerId, merchant_id: merchantId } });
    const inDiningOrders = await InDiningOrder.findAll({
      where: { customer_id: customerId, branch_id: { [Op.in]: (await merchant.getBranches()).map(b => b.id) } },
    });
    const bookings = await Booking.findAll({ where: { customer_id: customerId, merchant_id: merchantId } });

    const totalSpending = [...orders, ...inDiningOrders].reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const trends = {
      orderFrequency: customer.customerBehavior?.orderFrequency || 0,
      bookingFrequency: customer.customerBehavior?.bookingFrequency || 0,
      totalSpending,
      averageOrderValue: orders.length > 0 ? totalSpending / (orders.length + inDiningOrders.length) : 0,
      preferredBookingType: bookings.length > 0 ? bookings[0].booking_type : null,
      lastActivity: customer.customerBehavior?.lastUpdated || customer.updated_at,
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'analyze_behavior',
      details: { merchantId, customerId, trends },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'crm:behaviorAnalyzed', {
      merchantId,
      customerId,
      trends,
    }, `merchant:${merchantId}`);

    return trends;
  } catch (error) {
    logger.error('Error analyzing behavior', { error: error.message });
    throw error;
  }
}

/**
 * Creates targeted promotions for a segment.
 * @param {number} merchantId - Merchant ID.
 * @param {string} segmentId - Segment ID (highValue, frequent, occasional).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Promotion details.
 */
async function targetOffers(merchantId, segmentId, io) {
  try {
    if (!merchantId || !segmentId) throw new Error('Merchant ID and segment ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validSegments = ['highValue', 'frequent', 'occasional'];
    if (!validSegments.includes(segmentId)) throw new Error('Invalid segment ID');

    const offerDetails = {
      highValue: { discount: 20, minSpend: 100, type: 'percentage' },
      frequent: { discount: 10, minSpend: 50, type: 'percentage' },
      occasional: { discount: 5, type: 'fixed' },
    }[segmentId];

    const promotion = await Promotion.create({
      merchant_id: merchantId,
      criteria: { segment: segmentId },
      offer_details: offerDetails,
      status: 'active',
      created_at: new Date(),
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'target_offers',
      details: { merchantId, segmentId, offerDetails },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'crm:offersTargeted', {
      merchantId,
      segmentId,
      promotionId: promotion.id,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'offers_targeted',
      messageKey: 'crm.offers_targeted',
      messageParams: { segment: segmentId },
      role: 'merchant',
      module: 'crm',
      languageCode: merchant.preferred_language || 'en',
    });

    return promotion;
  } catch (error) {
    logger.error('Error targeting offers', { error: error.message });
    throw error;
  }
}

/**
 * Awards engagement points for customer actions.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackEngagementGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const points = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: 'engagement',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_engagement_gamification',
      details: { customerId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'crm:engagementPointsAwarded', {
      customerId,
      points: points.points,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'engagement_points_awarded',
      messageKey: 'crm.engagement_points_awarded',
      messageParams: { points: points.points },
      role: 'customer',
      module: 'crm',
      languageCode: customer.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking engagement gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  segmentCustomers,
  analyzeBehavior,
  targetOffers,
  trackEngagementGamification,
};