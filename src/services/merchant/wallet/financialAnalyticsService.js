'use strict';

/**
 * financialAnalyticsService.js
 * Manages financial transaction tracking, reporting, trend analysis, and goal recommendations for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Wallet, WalletTransaction, Merchant, Order, AuditLog, Notification } = require('@models');

/**
 * Monitors payments and payouts for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {string} period - Time period (daily, weekly, monthly).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Transaction summary.
 */
async function trackFinancialTransactions(merchantId, period, io) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) throw new Error('Invalid period');

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const startDate = new Date();
    if (period === 'daily') startDate.setDate(startDate.getDate() - 1);
    else if (period === 'weekly') startDate.setDate(startDate.getDate() - 7);
    else startDate.setMonth(startDate.getMonth() - 1);

    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        created_at: { [Op.gte]: startDate },
      },
    });

    const summary = {
      payments: transactions
        .filter(t => t.type === 'PAYMENT' && t.amount > 0)
        .reduce((sum, t) => sum + Number(t.amount), 0),
      payouts: transactions
        .filter(t => t.type === 'PAYOUT' && t.amount < 0)
        .reduce((sum, t) => sum + Number(Math.abs(t.amount)), 0),
      transactionCount: transactions.length,
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'track_financial_transactions',
      details: { merchantId, period, summary },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:transactionsTracked', {
      merchantId,
      period,
      summary,
    }, `merchant:${merchantId}`);

    return summary;
  } catch (error) {
    logger.error('Error tracking financial transactions', { error: error.message });
    throw error;
  }
}

/**
 * Creates revenue and payout summaries.
 * @param {number} merchantId - Merchant ID.
 * @param {string} period - Time period (daily, weekly, monthly).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Financial report.
 */
async function generateFinancialReport(merchantId, period, io) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validPeriods = ['daily', 'weekly', 'monthly'];
    if (!validPeriods.includes(period)) throw new Error('Invalid period');

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const startDate = new Date();
    if (period === 'daily') startDate.setDate(startDate.getDate() - 1);
    else if (period === 'weekly') startDate.setDate(startDate.getDate() - 7);
    else startDate.setMonth(startDate.getMonth() - 1);

    const [orders, transactions] = await Promise.all([
      Order.findAll({
        where: {
          merchant_id: merchantId,
          created_at: { [Op.gte]: startDate },
          payment_status: 'paid',
        },
      }),
      WalletTransaction.findAll({
        where: {
          wallet_id: wallet.id,
          created_at: { [Op.gte]: startDate },
        },
      }),
    ]);

    const report = {
      revenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      payouts: transactions
        .filter(t => t.type === 'PAYOUT' && t.amount < 0)
        .reduce((sum, t) => sum + Number(Math.abs(t.amount)), 0),
      orderCount: orders.length,
      payoutCount: transactions.filter(t => t.type === 'PAYOUT').length,
      period,
      currency: wallet.currency,
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'generate_financial_report',
      details: { merchantId, period, report },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:reportGenerated', {
      merchantId,
      period,
      report,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'financial_report_generated',
      messageKey: 'analytics.report_generated',
      messageParams: { period, revenue: report.revenue, currency: report.currency },
      role: 'merchant',
      module: 'analytics',
      languageCode: merchant.preferred_language || 'en',
    });

    return report;
  } catch (error) {
    logger.error('Error generating financial report', { error: error.message });
    throw error;
  }
}

/**
 * Provides financial performance insights.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Trend analysis.
 */
async function analyzeFinancialTrends(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [orders, transactions] = await Promise.all([
      Order.findAll({
        where: {
          merchant_id: merchantId,
          created_at: { [Op.gte]: sixMonthsAgo },
          payment_status: 'paid',
        },
        attributes: ['total_amount', 'created_at'],
      }),
      WalletTransaction.findAll({
        where: {
          wallet_id: wallet.id,
          created_at: { [Op.gte]: sixMonthsAgo },
        },
        attributes: ['type', 'amount', 'created_at'],
      }),
    ]);

    const monthlyTrends = Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(sixMonthsAgo);
      monthStart.setMonth(sixMonthsAgo.getMonth() + i);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthStart.getMonth() + 1);

      const monthlyOrders = orders.filter(o => o.created_at >= monthStart && o.created_at < monthEnd);
      const monthlyTransactions = transactions.filter(t => t.created_at >= monthStart && t.created_at < monthEnd);

      return {
        month: monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthlyOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        payouts: monthlyTransactions
          .filter(t => t.type === 'PAYOUT' && t.amount < 0)
          .reduce((sum, t) => sum + Number(Math.abs(t.amount)), 0),
      };
    });

    const trends = {
      revenueTrend: monthlyTrends.map(t => t.revenue),
      payoutTrend: monthlyTrends.map(t => t.payouts),
      averageRevenue: monthlyTrends.reduce((sum, t) => sum + t.revenue, 0) / 6,
      averagePayouts: monthlyTrends.reduce((sum, t) => sum + t.payouts, 0) / 6,
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'analyze_financial_trends',
      details: { merchantId, trends },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:trendsAnalyzed', {
      merchantId,
      trends,
    }, `merchant:${merchantId}`);

    return trends;
  } catch (error) {
    logger.error('Error analyzing financial trends', { error: error.message });
    throw error;
  }
}

/**
 * Suggests revenue targets based on performance.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Financial goals.
 */
async function recommendFinancialGoals(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const orders = await Order.findAll({
      where: {
        merchant_id: merchantId,
        created_at: { [Op.gte]: threeMonthsAgo },
        payment_status: 'paid',
      },
      attributes: ['total_amount'],
    });

    const averageRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0) / 3;
    const growthFactor = 1.1; // 10% growth target

    const goals = {
      monthlyRevenueTarget: Math.round(averageRevenue * growthFactor),
      quarterlyRevenueTarget: Math.round(averageRevenue * growthFactor * 3),
      suggestions: [
        'Increase order volume by 10% through promotions.',
        'Optimize menu pricing to boost revenue.',
        'Expand delivery radius to attract more customers.',
      ],
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'recommend_financial_goals',
      details: { merchantId, goals },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:goalsRecommended', {
      merchantId,
      goals,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'financial_goals_recommended',
      messageKey: 'analytics.goals_recommended',
      messageParams: { monthlyTarget: goals.monthlyRevenueTarget, currency: 'MWK' },
      role: 'merchant',
      module: 'analytics',
      languageCode: merchant.preferred_language || 'en',
    });

    return goals;
  } catch (error) {
    logger.error('Error recommending financial goals', { error: error.message });
    throw error;
  }
}

module.exports = {
  trackFinancialTransactions,
  generateFinancialReport,
  analyzeFinancialTrends,
  recommendFinancialGoals,
};