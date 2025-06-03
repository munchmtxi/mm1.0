'use strict';

/**
 * analyticsService.js
 *
 * Centralized service for merchant analytics, handling sales tracking, booking trends,
 * gamification metrics, performance reports, and customer engagement for mtables.
 * Integrates with Sequelize models, notificationService, socketService, auditService,
 * and pointService for comprehensive analytics.
 *
 * Last Updated: May 20, 2025
 */

const { Op, Sequelize } = require('sequelize');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localizationService');
const { Booking, InDiningOrder, Table, Customer, User, GamificationPoints } = require('@models');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const merchantConstants = require('@constants/merchantConstants');
const customerConstants = require('@constants/customerConstants');
const mtablesConstants = require('@constants/mtablesConstants');

class AnalyticsService {
  /**
   * Tracks sales for bookings and orders.
   * @param {number} restaurantId - Merchant ID
   * @param {string} period - Time period (daily, weekly, monthly, yearly)
   * @returns {Promise<Object>} Sales data
   */
  async trackSales(restaurantId, period) {
    try {
      if (!restaurantId || !merchantConstants.ANALYTICS_CONSTANTS.FINANCIAL_ANALYTICS.REPORT_PERIODS.includes(period)) {
        throw new Error('Invalid restaurant ID or period');
      }

      const dateRange = this.getDateRange(period);
      const [bookingSales, orderSales] = await Promise.all([
        Booking.findAll({
          where: {
            merchant_id: restaurantId,
            status: mtablesConstants.BOOKING_STATUSES.CHECKED_IN,
            created_at: { [Op.between]: [dateRange.start, dateRange.end] },
          },
          attributes: [
            [Sequelize.fn('SUM', Sequelize.col('guest_count')), 'totalGuests'],
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalBookings'],
          ],
        }),
        InDiningOrder.findAll({
          where: {
            branch_id: { [Op.in]: Sequelize.literal(`(SELECT id FROM merchant_branches WHERE merchant_id = ${restaurantId})`) },
            status: merchantConstants.MUNCH_CONSTANTS.ORDER_STATUSES.DELIVERED,
            payment_status: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.COMPLETED,
            created_at: { [Op.between]: [dateRange.start, dateRange.end] },
          },
          attributes: [
            [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'totalRevenue'],
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalOrders'],
          ],
        }),
      ]);

      const result = {
        totalGuests: bookingSales[0]?.dataValues.totalGuests || 0,
        totalBookings: bookingSales[0]?.dataValues.totalBookings || 0,
        totalRevenue: orderSales[0]?.dataValues.totalRevenue || 0,
        totalOrders: orderSales[0]?.dataValues.totalOrders || 0,
      };

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.SALES_TRACKED,
        details: { period, ...result },
        ipAddress: '127.0.0.1', // Placeholder
      });

      return result;
    } catch (error) {
      logger.logErrorEvent(`trackSales failed: ${error.message}`, { restaurantId, period });
      throw error;
    }
  }

  /**
   * Analyzes reservation patterns.
   * @param {number} restaurantId - Merchant ID
   * @param {string} period - Time period (daily, weekly, monthly, yearly)
   * @returns {Promise<Object>} Booking trends
   */
  async analyzeBookingTrends(restaurantId, period) {
    try {
      if (!restaurantId || !merchantConstants.ANALYTICS_CONSTANTS.FINANCIAL_ANALYTICS.REPORT_PERIODS.includes(period)) {
        throw new Error('Invalid restaurant ID or period');
      }

      const dateRange = this.getDateRange(period);
      const trends = await Booking.findAll({
        where: {
          merchant_id: restaurantId,
          created_at: { [Op.between]: [dateRange.start, dateRange.end] },
        },
        attributes: [
          [Sequelize.fn('DATE_TRUNC', period, Sequelize.col('created_at')), 'period'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'bookingCount'],
          [Sequelize.fn('SUM', Sequelize.col('guest_count')), 'guestCount'],
          'status',
          'seating_preference',
        ],
        group: ['period', 'status', 'seating_preference'],
        include: [{
          model: Table,
          as: 'table',
          attributes: ['table_type', 'location_type'],
          where: {
            table_type: { [Op.in]: mtablesConstants.TABLE_MANAGEMENT.TABLE_TYPES },
            location_type: { [Op.in]: mtablesConstants.TABLE_MANAGEMENT.LOCATION_TYPES },
          },
        }],
      });

      const result = trends.map(t => ({
        period: t.dataValues.period,
        bookingCount: t.dataValues.bookingCount,
        guestCount: t.dataValues.guestCount,
        status: t.status,
        seatingPreference: t.seating_preference,
        tableType: t.table?.table_type,
        locationType: t.table?.location_type,
      }));

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.BOOKING_TRENDS_ANALYZED,
        details: { period, trendsCount: result.length },
        ipAddress: '127.0.0.1',
      });

      return result;
    } catch (error) {
      logger.logErrorEvent(`analyzeBookingTrends failed: ${error.message}`, { restaurantId, period });
      throw error;
    }
  }

  /**
   * Records customer/staff gamification points.
   * @param {number} restaurantId - Merchant ID
   * @returns {Promise<Object>} Gamification metrics
   */
  async trackGamificationMetrics(restaurantId) {
    try {
      if (!restaurantId) throw new Error('Invalid restaurant ID');

      const metrics = await GamificationPoints.findAll({
        where: {
          [Op.or]: [
            { user_id: { [Op.in]: Sequelize.literal(`(SELECT user_id FROM staff WHERE merchant_id = ${restaurantId})`) } },
            { user_id: { [Op.in]: Sequelize.literal(`(SELECT user_id FROM customers WHERE id IN (SELECT customer_id FROM bookings WHERE merchant_id = ${restaurantId}))`) } },
          ],
        },
        attributes: [
          'role',
          'sub_role',
          'action',
          [Sequelize.fn('SUM', Sequelize.col('points')), 'totalPoints'],
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'actionCount'],
        ],
        group: ['role', 'sub_role', 'action'],
      });

      const result = metrics.map(m => ({
        role: m.role,
        subRole: m.sub_role,
        action: m.action,
        totalPoints: m.dataValues.totalPoints,
        actionCount: m.dataValues.actionCount,
      }));

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.GAMIFICATION_TRACKED,
        details: { metricsCount: result.length },
        ipAddress: '127.0.0.1',
      });

      return result;
    } catch (error) {
      logger.logErrorEvent(`trackGamificationMetrics failed: ${error.message}`, { restaurantId });
      throw error;
    }
  }

  /**
   * Creates performance reports.
   * @param {number} restaurantId - Merchant ID
   * @returns {Promise<Object>} Performance report
   */
  async generateBookingReports(restaurantId) {
    try {
      if (!restaurantId) throw new Error('Invalid restaurant ID');

      const [sales, trends, metrics] = await Promise.all([
        this.trackSales(restaurantId, 'monthly'),
        this.analyzeBookingTrends(restaurantId, 'monthly'),
        this.trackGamificationMetrics(restaurantId),
      ]);

      const report = {
        sales,
        bookingTrends: trends,
        gamificationMetrics: metrics,
        generatedAt: new Date(),
      };

      await notificationService.sendNotification({
        userId: restaurantId,
        notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'analytics.report_generated',
        messageParams: { date: report.generatedAt },
        role: 'merchant',
        module: 'analytics',
      });

      await socketService.emit({
        event: 'analytics:report_generated',
        data: { restaurantId, reportId: report.generatedAt.getTime() },
        room: `merchant:${restaurantId}`,
      });

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.REPORT_GENERATED,
        details: { generatedAt: report.generatedAt },
        ipAddress: '127.0.0.1',
      });

      return report;
    } catch (error) {
      logger.logErrorEvent(`generateBookingReports failed: ${error.message}`, { restaurantId });
      throw error;
    }
  }

  /**
   * Tracks customer interactions.
   * @param {number} restaurantId - Merchant ID
   * @returns {Promise<Object>} Engagement data
   */
  async analyzeCustomerEngagement(restaurantId) {
    try {
      if (!restaurantId) throw new Error('Invalid restaurant ID');

      const customers = await Customer.findAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'preferred_language'],
          },
          {
            model: Booking,
            as: 'bookings',
            where: { merchant_id: restaurantId },
            required: false,
          },
          {
            model: InDiningOrder,
            as: 'orders',
            where: { branch_id: { [Op.in]: Sequelize.literal(`(SELECT id FROM merchant_branches WHERE merchant_id = ${restaurantId})`) } },
            required: false,
          },
        ],
      });

      const engagement = customers.map(c => {
        const bookingCount = c.bookings.length;
        const orderCount = c.orders.length;
        const engagementScore = bookingCount * 2 + orderCount * 3; // Weighted score
        return {
          userId: c.user.id,
          bookingCount,
          orderCount,
          engagementScore,
        };
      });

      const topEngaged = engagement.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 10);

      for (const customer of topEngaged) {
        await pointService.awardPoints({
          userId: customer.userId,
          role: 'customer',
          action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.CROSS_SERVICE_USAGE.action,
          languageCode: (await User.findByPk(customer.userId)).preferred_language,
        });
      }

      await auditService.logAction({
        userId: restaurantId,
        role: 'merchant',
        action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.ENGAGEMENT_ANALYZED,
        details: { topEngagedCount: topEngaged.length },
        ipAddress: '127.0.0.1',
      });

      return { topEngaged, totalCustomers: engagement.length };
    } catch (error) {
      logger.logErrorEvent(`analyzeCustomerEngagement failed: ${error.message}`, { restaurantId });
      throw error;
    }
  }

  /**
   * Helper: Generates date range for period.
   * @param {string} period - Time period
   * @returns {Object} Start and end dates
   */
  getDateRange(period) {
    const end = new Date();
    const start = new Date();
    switch (period) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'yearly':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        throw new Error('Invalid period');
    }
    return { start, end };
  }
}

module.exports = new AnalyticsService();