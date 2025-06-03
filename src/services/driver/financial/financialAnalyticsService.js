'use strict';

/**
 * Driver Financial Analytics Service
 * Provides financial analytics for drivers, including earnings trends,
 * financial summaries, goal recommendations, and peer comparisons.
 */

const { Driver, WalletTransaction, FinancialSummary, sequelize } = require('@models');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

/**
 * Analyzes earnings patterns for a driver.
 * @param {number} driverId - Driver ID.
 * @param {string} period - Period (daily, weekly, monthly, yearly).
 * @returns {Promise<Array<Object>>} Earnings trend data.
 */
async function getEarningsTrends(driverId, period) {
  if (!paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const dateFilter = {};
  const now = new Date();
  if (period === 'daily') dateFilter[Op.gte] = new Date(now.setHours(0, 0, 0, 0));
  else if (period === 'weekly') dateFilter[Op.gte] = new Date(now.setDate(now.getDate() - 7));
  else if (period === 'monthly') dateFilter[Op.gte] = new Date(now.setMonth(now.getMonth() - 1));
  else if (period === 'yearly') dateFilter[Op.gte] = new Date(now.setFullYear(now.getFullYear() - 1));

  const transactions = await WalletTransaction.findAll({
    where: {
      wallet_id: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.EARNING,
      created_at: dateFilter,
    },
    order: [['created_at', 'ASC']],
  });

  const trends = transactions.reduce((acc, t) => {
    const date = t.created_at.toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + parseFloat(t.amount);
    return acc;
  }, {});

  const result = Object.entries(trends).map(([date, amount]) => ({ date, amount }));

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'GET_EARNINGS_TRENDS',
    details: { driverId, period, trendCount: result.length },
    ipAddress: 'unknown',
  });

  logger.info('Earnings trends retrieved', { driverId, period });
  return result;
}

/**
 * Provides a financial overview for a driver.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Financial summary.
 */
async function getFinancialSummary(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const summaries = await FinancialSummary.findAll({
    where: { driver_id: driverId },
    order: [['created_at', 'DESC']],
  });

  const latestSummary = summaries[0] || {
    total_earnings: 0,
    total_payouts: 0,
    total_taxes: 0,
    currency: wallet.currency,
    period: 'monthly',
  };

  const summary = {
    driverId,
    totalEarnings: parseFloat(latestSummary.total_earnings),
    totalPayouts: parseFloat(latestSummary.total_payouts),
    totalTaxes: parseFloat(latestSummary.total_taxes),
    currency: latestSummary.currency,
    period: latestSummary.period,
  };

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'GET_FINANCIAL_SUMMARY',
    details: { driverId, period: summary.period },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
    message: formatMessage(
      'driver',
      'financial',
      driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      'financial.summary_viewed',
      { period: summary.period }
    ),
    priority: 'LOW',
  });

  logger.info('Financial summary retrieved', { driverId, period: summary.period });
  return summary;
}

/**
 * Suggests financial goals for a driver.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Recommended goals.
 */
async function recommendFinancialGoals(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transactions = await WalletTransaction.findAll({
    where: {
      wallet_id: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.EARNING,
      created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
    },
  });

  const monthlyEarnings = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const recommendedGoal = monthlyEarnings * 1.2; // Suggest 20% increase

  const goals = {
    driverId,
    monthlyEarningsGoal: recommendedGoal,
    currency: wallet.currency,
    recommendation: 'Increase weekly shifts by 10% or target high-demand periods.',
  };

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'RECOMMEND_FINANCIAL_GOALS',
    details: { driverId, monthlyEarningsGoal: recommendedGoal },
    ipAddress: 'unknown',
  });

  socketService.emitToUser(driver.user_id, 'financial:goals_recommended', goals);

  logger.info('Financial goals recommended', { driverId, monthlyEarningsGoal: recommendedGoal });
  return goals;
}

/**
 * Compares driver's financial performance with peers.
 * @param {number} driverId - Driver ID.
 * @param {string} peers - Peer group (e.g., 'city', 'country').
 * @returns {Promise<Object>} Comparison data.
 */
async function compareFinancialPerformance(driverId, peers) {
  if (!['city', 'country'].includes(peers)) {
    throw new AppError('Invalid peer group', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const driverSummary = await FinancialSummary.findOne({
    where: { driver_id: driverId, period: 'monthly' },
  });

  const peerFilter = peers === 'city' ? { city: driver.city } : { country: driver.country };
  const peerSummaries = await FinancialSummary.findAll({
    where: { period: 'monthly' },
    include: [{ model: Driver, as: 'driver', where: peerFilter }],
  });

  const driverEarnings = driverSummary ? parseFloat(driverSummary.total_earnings) : 0;
  const peerAvgEarnings = peerSummaries.length
    ? peerSummaries.reduce((sum, s) => sum + parseFloat(s.total_earnings), 0) / peerSummaries.length
    : 0;

  const comparison = {
    driverId,
    driverEarnings,
    peerAverageEarnings: peerAvgEarnings,
    peerGroup: peers,
    currency: wallet.currency,
    performance: driverEarnings > peerAvgEarnings ? 'above_average' : 'below_average',
  };

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'COMPARE_FINANCIAL_PERFORMANCE',
    details: { driverId, peers, driverEarnings, peerAverageEarnings: peerAvgEarnings },
    ipAddress: 'unknown',
  });

  logger.info('Financial performance compared', { driverId, peers });
  return comparison;
}

module.exports = {
  getEarningsTrends,
  getFinancialSummary,
  recommendFinancialGoals,
  compareFinancialPerformance,
};