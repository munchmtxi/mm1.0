'use strict';

const { Driver, WalletTransaction, FinancialSummary, Wallet, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverGamificationConstants = require('@constants/driver/driverGamificationConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function getEarningsTrends(driverId, period, { pointService, auditService, notificationService, socketService }) {
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

  const transaction = await sequelize.transaction();
  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.EARNING,
        created_at: dateFilter,
      },
      order: [['created_at', 'ASC']],
      transaction,
    });

    const trends = transactions.reduce((acc, t) => {
      const date = t.created_at.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + parseFloat(t.amount);
      return acc;
    }, {});

    const result = Object.entries(trends).map(([date, amount]) => ({ date, amount }));

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_EARNINGS_TRENDS',
        details: { driverId, period, trendCount: result.length },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'earnings_trends_access',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'earnings_trends_access').points,
      { action: `Accessed earnings trends for ${period}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        message: formatMessage(
          'driver',
          'financial',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'financial.trends_viewed',
          { period }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'financial:trends_retrieved', { driverId, period, trends: result });

    await transaction.commit();
    logger.info('Earnings trends retrieved', { driverId, period });
    return result;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get earnings trends failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getFinancialSummary(driverId, { pointService, auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const summaries = await FinancialSummary.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
      transaction,
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

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_FINANCIAL_SUMMARY',
        details: { driverId, period: summary.period },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const today = new Date().toISOString().split('T')[0];
    const existingPoints = await pointService.getPointsHistory(driverId, 'financial_summary_access', {
      startDate: new Date(today),
      endDate: new Date(today + 'T23:59:59.999Z'),
    });
    if (!existingPoints.length) {
      await pointService.awardPoints(
        driverId,
        'financial_summary_access',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'financial_summary_access').points,
        { action: 'Accessed financial summary' },
        transaction
      );
    }

    await notificationService.sendNotification(
      {
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
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'financial:summary_retrieved', summary);

    await transaction.commit();
    logger.info('Financial summary retrieved', { driverId, period: summary.period });
    return summary;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get financial summary failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function recommendFinancialGoals(driverId, { pointService, auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.EARNING,
        created_at: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 1)) },
      },
      transaction,
    });

    const monthlyEarnings = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const recommendedGoal = monthlyEarnings * 1.2;

    const goals = {
      driverId,
      monthlyEarningsGoal: recommendedGoal,
      currency: wallet.currency,
      recommendation: 'Increase weekly shifts by 10% or target high-demand periods.',
    };

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'RECOMMEND_FINANCIAL_GOALS',
        details: { driverId, monthlyEarningsGoal: recommendedGoal },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'financial_goals_access',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'financial_goals_access').points,
      { action: 'Accessed financial goals recommendation' },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        message: formatMessage(
          'driver',
          'financial',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'financial.goals_viewed',
          { goal: recommendedGoal }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'financial:goals_recommended', goals);

    await transaction.commit();
    logger.info('Financial goals recommended', { driverId, monthlyEarningsGoal: recommendedGoal });
    return goals;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Recommend financial goals failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function compareFinancialPerformance(driverId, peers, { pointService, auditService, notificationService, socketService }) {
  if (!['city', 'country'].includes(peers)) {
    throw new AppError('Invalid peer group', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const driverSummary = await FinancialSummary.findOne({
      where: { driver_id: driverId, period: 'monthly' },
      transaction,
    });

    const peerFilter = peers === 'city' ? { city: driver.city } : { country: driver.country };
    const peerSummaries = await FinancialSummary.findAll({
      where: { period: 'monthly' },
      include: [{ model: Driver, as: 'driver', where: peerFilter }],
      transaction,
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

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'COMPARE_FINANCIAL_PERFORMANCE',
        details: { driverId, peers, driverEarnings, peerAverageEarnings: peerAvgEarnings },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'financial_comparison_access',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'financial_comparison_access').points,
      { action: `Accessed financial comparison with ${peers}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        message: formatMessage(
          'driver',
          'financial',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'financial.comparison_viewed',
          { peers }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, 'financial:comparison_retrieved', comparison);

    await transaction.commit();
    logger.info('Financial performance compared', { driverId, peers });
    return comparison;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Compare financial performance failed: ${error.message}`, 500, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

module.exports = {
  getEarningsTrends,
  getFinancialSummary,
  recommendFinancialGoals,
  compareFinancialPerformance,
};