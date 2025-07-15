'use strict';

const { Op } = require('sequelize');
const { MerchantBranch, BranchMetrics, BranchInsights, Merchant, BranchActivity, MerchantProfileAnalytics, MerchantActivityLog, MerchantActiveViewer } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function aggregateBranchData(merchantId, ipAddress, transaction = null) {
  try {
    if (!merchantId) {
      throw new AppError('Invalid merchant ID', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true }, transaction });
    if (!branches.length) {
      throw new AppError('No branches found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const metrics = await BranchMetrics.findAll({
      where: {
        branch_id: branches.map((b) => b.id),
        metric_date: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      transaction,
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

    logger.info(`Branch data aggregated for merchant ${merchantId}`);
    return {
      merchantId,
      aggregatedData,
      language: merchant.preferred_language || 'en',
      action: 'branchDataAggregated',
    };
  } catch (error) {
    throw handleServiceError('aggregateBranchData', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function compareBranchPerformance(merchantId, ipAddress, transaction = null) {
  try {
    if (!merchantId) {
      throw new AppError('Invalid merchant ID', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true }, transaction });
    if (!branches.length) {
      throw new AppError('No branches found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const insights = await BranchInsights.findAll({
      where: {
        merchant_id: merchantId,
        period_end: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      transaction,
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

    logger.info(`Branch performance compared for merchant ${merchantId}`);
    return {
      merchantId,
      ranked,
      language: merchant.preferred_language || 'en',
      action: 'branchPerformanceCompared',
    };
  } catch (error) {
    throw handleServiceError('compareBranchPerformance', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function generateMultiBranchReports(merchantId, ipAddress, transaction = null) {
  try {
    if (!merchantId) {
      throw new AppError('Invalid merchant ID', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true }, transaction });
    if (!branches.length) {
      throw new AppError('No branches found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const metrics = await BranchMetrics.findAll({
      where: {
        branch_id: branches.map((b) => b.id),
        metric_date: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      transaction,
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
      ip_address: ipAddress,
    }, { transaction });

    logger.info(`Multi-branch report generated for merchant ${merchantId}`);
    return {
      merchantId,
      report,
      language: merchant.preferred_language || 'en',
      action: 'multiBranchReportsGenerated',
    };
  } catch (error) {
    throw handleServiceError('generateMultiBranchReports', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function allocateResources(merchantId, ipAddress, transaction = null) {
  try {
    if (!merchantId) {
      throw new AppError('Invalid merchant ID', 400, merchantConstants.ERROR_CODES.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId, is_active: true }, transaction });
    if (!branches.length) {
      throw new AppError('No branches found', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const insights = await BranchInsights.findAll({
      where: {
        merchant_id: merchantId,
        period_end: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      transaction,
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
      ip_address: ipAddress,
    }, { transaction });

    logger.info(`Resources allocated for merchant ${merchantId}`);
    return {
      merchantId,
      suggestions: normalizedAllocations,
      language: merchant.preferred_language || 'en',
      action: 'resourcesAllocated',
    };
  } catch (error) {
    throw handleServiceError('allocateResources', error, merchantConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = {
  aggregateBranchData,
  compareBranchPerformance,
  generateMultiBranchReports,
  allocateResources,
};