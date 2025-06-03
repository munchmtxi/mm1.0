'use strict';

/**
 * multiBranchAnalyticsService.js
 * Manages multi-branch analytics for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const {
  MerchantBranch,
  BranchMetrics,
  BranchInsights,
  Merchant,
  BranchActivity,
  Notification,
  AuditLog,
} = require('@models');

/**
 * Compiles performance data across all branches for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Aggregated branch data.
 */
async function aggregateBranchData(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true } });
    if (!branches.length) throw new Error('No active branches found');

    const metrics = await BranchMetrics.findAll({
      where: {
        branch_id: branches.map((b) => b.id),
        metric_date: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
    });

    const aggregatedData = branches.map((branch) => {
      const branchMetrics = metrics.filter((m) => m.branch_id === branch.id);
      const totalOrders = branchMetrics.reduce((sum, m) => sum + m.total_orders, 0);
      const totalRevenue = branchMetrics.reduce((sum, m) => sum + parseFloat(m.total_revenue), 0);
      const avgOrderValue = totalOrders ? (totalRevenue / totalOrders).toFixed(2) : 0;

      return {
        branchId: branch.id,
        branchName: branch.name,
        totalOrders,
        totalRevenue,
        averageOrderValue: avgOrderValue,
        customerSentiment: branchMetrics[0]?.customer_sentiment_metrics || { positive_reviews: 0, negative_reviews: 0 },
      };
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'aggregate_branch_data',
      details: { merchantId, branchCount: branches.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:dataAggregated', {
      merchantId,
      branchCount: branches.length,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'branch_data_aggregated',
      messageKey: 'analytics.branch_data_aggregated',
      messageParams: { branchCount: branches.length },
      role: 'merchant',
      module: 'analytics',
      languageCode: merchant.preferred_language || 'en',
    });

    return aggregatedData;
  } catch (error) {
    logger.error('Error aggregating branch data', { error: error.message });
    throw error;
  }
}

/**
 * Analyzes and compares performance metrics across branches.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Comparison results.
 */
async function compareBranchPerformance(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true } });
    if (!branches.length) throw new Error('No active branches found');

    const insights = await BranchInsights.findAll({
      where: {
        merchant_id: merchantId,
        period_end: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
    });

    const comparison = branches.map((branch) => {
      const branchInsights = insights.filter((i) => i.branch_id === branch.id);
      const metrics = branchInsights[0]?.metrics || {};
      const performanceScores = branchInsights[0]?.performance_scores || { overall: 0, service: 0 };

      return {
        branchId: branch.id,
        branchName: branch.name,
        revenue: metrics.revenue || 0,
        orders: metrics.orders || 0,
        customerRetention: metrics.customerRetention || 0,
        performanceScore: performanceScores.overall,
      };
    });

    const ranked = comparison.sort((a, b) => b.performanceScore - a.performanceScore);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'compare_branch_performance',
      details: { merchantId, branchCount: branches.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:performanceCompared', {
      merchantId,
      branchCount: branches.length,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'branch_performance_compared',
      messageKey: 'analytics.branch_performance_compared',
      messageParams: { branchCount: branches.length },
      role: 'merchant',
      module: 'analytics',
      languageCode: merchant.preferred_language || 'en',
    });

    return ranked;
  } catch (error) {
    logger.error('Error comparing branch performance', { error: error.message });
    throw error;
  }
}

/**
 * Creates centralized reports for all branches.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Generated report.
 */
async function generateMultiBranchReports(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true } });
    if (!branches.length) throw new Error('No active branches found');

    const metrics = await BranchMetrics.findAll({
      where: {
        branch_id: branches.map((b) => b.id),
        metric_date: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
    });

    const report = {
      merchantId,
      branches: branches.map((branch) => {
        const branchMetrics = metrics.filter((m) => m.branch_id === branch.id);
        const totalRevenue = branchMetrics.reduce((sum, m) => sum + parseFloat(m.total_revenue), 0);
        const totalOrders = branchMetrics.reduce((sum, m) => sum + m.total_orders, 0);
        const avgRating = branchMetrics[0]?.customer_ratings?.average_rating || 0;

        return {
          branchId: branch.id,
          branchName: branch.name,
          totalRevenue,
          totalOrders,
          averageRating: avgRating,
          peakHours: branchMetrics[0]?.peak_hours || {},
        };
      }),
      summary: {
        totalRevenue: metrics.reduce((sum, m) => sum + parseFloat(m.total_revenue), 0),
        totalOrders: metrics.reduce((sum, m) => sum + m.total_orders, 0),
        branchCount: branches.length,
      },
    };

    await BranchActivity.create({
      branch_id: branches[0].id,
      user_id: merchant.user_id,
      activity_type: 'settings_update',
      description: 'Generated multi-branch report',
      changes: { reportSummary: report.summary },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'generate_multi_branch_reports',
      details: { merchantId, branchCount: branches.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:reportsGenerated', {
      merchantId,
      branchCount: branches.length,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'multi_branch_reports_generated',
      messageKey: 'analytics.multi_branch_reports_generated',
      messageParams: { branchCount: branches.length },
      role: 'merchant',
      module: 'analytics',
      languageCode: merchant.preferred_language || 'en',
    });

    return report;
  } catch (error) {
    logger.error('Error generating multi-branch reports', { error: error.message });
    throw error;
  }
}

/**
 * Suggests resource allocation based on branch performance.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Resource allocation suggestions.
 */
async function allocateResources(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true } });
    if (!branches.length) throw new Error('No active branches found');

    const insights = await BranchInsights.findAll({
      where: {
        merchant_id: merchantId,
        period_end: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
    });

    const allocations = branches.map((branch) => {
      const branchInsights = insights.filter((i) => i.branch_id === branch.id);
      const metrics = branchInsights[0]?.metrics || {};
      const performance = branchInsights[0]?.performance_scores?.overall || 0;

      const resourceScore = (metrics.revenue || 0) * 0.4 + (metrics.orders || 0) * 0.3 + performance * 0.3;
      return {
        branchId: branch.id,
        branchName: branch.name,
        resourceScore,
        suggestedStaff: Math.ceil(resourceScore / 1000),
        suggestedInventory: Math.ceil((metrics.orders || 0) * 1.2),
      };
    });

    const totalResources = allocations.reduce((sum, a) => sum + a.resourceScore, 0);
    const normalizedAllocations = allocations.map((a) => ({
      ...a,
      resourcePercentage: totalResources ? ((a.resourceScore / totalResources) * 100).toFixed(2) : 0,
    }));

    await BranchActivity.create({
      branch_id: branches[0].id,
      user_id: merchant.user_id,
      activity_type: 'settings_update',
      description: 'Generated resource allocation suggestions',
      changes: { branchCount: branches.length },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'allocate_resources',
      details: { merchantId, branchCount: branches.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'analytics:resourcesAllocated', {
      merchantId,
      branchCount: branches.length,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'resources_allocated',
      messageKey: 'analytics.resources_allocated',
      messageParams: { branchCount: branches.length },
      role: 'merchant',
      module: 'analytics',
      languageCode: merchant.preferred_language || 'en',
    });

    return normalizedAllocations;
  } catch (error) {
    logger.error('Error allocating resources', { error: error.message });
    throw error;
  }
}

module.exports = {
  aggregateBranchData,
  compareBranchPerformance,
  generateMultiBranchReports,
  allocateResources,
};