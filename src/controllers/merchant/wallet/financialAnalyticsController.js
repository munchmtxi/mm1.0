// financialAnalyticsController.js
// Handles financial analytics-related requests for merchants, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const financialAnalyticsService = require('@services/merchant/wallet/financialAnalyticsService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { Merchant } = require('@models');

async function trackFinancialTransactions(req, res, next) {
  try {
    const { merchantId, period } = req.body;
    const io = req.app.get('io');

    const summary = await financialAnalyticsService.trackFinancialTransactions(merchantId, period);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'track_financial_transactions',
      details: { merchantId, period, summary },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'track_financial_transactions',
      points: 10,
      details: { merchantId, period, transactionCount: summary.transactionCount },
    });

    socketService.emit(io, 'merchant:analytics:transactionsTracked', {
      merchantId,
      period,
      summary,
    }, `merchant:${merchantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.transactions_tracked', { period, count: summary.transactionCount }, merchant.preferred_language || 'en'),
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

async function generateFinancialReport(req, res, next) {
  try {
    const { merchantId, period } = req.body;
    const io = req.app.get('io');

    const report = await financialAnalyticsService.generateFinancialReport(merchantId, period);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'generate_financial_report',
      details: { merchantId, period, report },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'generate_financial_report',
      points: 15,
      details: { merchantId, period, revenue: report.revenue },
    });

    socketService.emit(io, 'merchant:analytics:reportGenerated', {
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

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.report_generated', { period, revenue: report.revenue, currency: report.currency }, merchant.preferred_language || 'en'),
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function analyzeFinancialTrends(req, res, next) {
  try {
    const { merchantId } = req.body;
    const io = req.app.get('io');

    const trends = await financialAnalyticsService.analyzeFinancialTrends(merchantId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'analyze_financial_trends',
      details: { merchantId, trends },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'analyze_financial_trends',
      points: 20,
      details: { merchantId, averageRevenue: trends.averageRevenue },
    });

    socketService.emit(io, 'merchant:analytics:trendsAnalyzed', {
      merchantId,
      trends,
    }, `merchant:${merchantId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.trends_analyzed', { averageRevenue: trends.averageRevenue }, merchant.preferred_language || 'en'),
      data: trends,
    });
  } catch (error) {
    next(error);
  }
}

async function recommendFinancialGoals(req, res, next) {
  try {
    const { merchantId } = req.body;
    const io = req.app.get('io');

    const goals = await financialAnalyticsService.recommendFinancialGoals(merchantId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'recommend_financial_goals',
      details: { merchantId, goals },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'recommend_financial_goals',
      points: 15,
      details: { merchantId, monthlyRevenueTarget: goals.monthlyRevenueTarget },
    });

    socketService.emit(io, 'merchant:analytics:goalsRecommended', {
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

    res.status(200).json({
      success: true,
      message: formatMessage('analytics.goals_recommended', { monthlyTarget: goals.monthlyRevenueTarget, currency: 'MWK' }, merchant.preferred_language || 'en'),
      data: goals,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  trackFinancialTransactions,
  generateFinancialReport,
  analyzeFinancialTrends,
  recommendFinancialGoals,
};