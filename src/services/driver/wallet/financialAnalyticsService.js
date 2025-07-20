'use strict';

const { Driver, Wallet, WalletTransaction, FinancialSummary, DriverEarnings, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverWalletConstants = require('@constants/driver/driverWalletConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal, averageArray, standardDeviation } = require('@utils/mathUtils');
const { getStartOfDay, subtractDaysFromDate } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function getEarningsTrends(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.FINANCIAL_ANALYTICS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const dateFilter = {};
  const now = new Date();
  if (period === 'daily') dateFilter[Op.gte] = getStartOfDay(now);
  else if (period === 'weekly') dateFilter[Op.gte] = subtractDaysFromDate(now, 7);
  else if (period === 'monthly') dateFilter[Op.gte] = subtractDaysFromDate(now, 30);
  else if (period === 'yearly') dateFilter[Op.gte] = subtractDaysFromDate(now, 365);

  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES,
        created_at: dateFilter,
      },
      order: [['created_at', 'ASC']],
    });

    const earnings = await DriverEarnings.findAll({
      where: { driver_id: driverId, created_at: dateFilter },
    });

    const trends = transactions.reduce((acc, t) => {
      const date = t.created_at.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + roundToDecimal(parseFloat(t.amount), 2);
      return acc;
    }, {});

    const result = Object.entries(trends).map(([date, amount]) => ({
      date,
      amount,
      currency,
    }));

    const amounts = result.map(r => r.amount);
    const metrics = {
      averageEarnings: amounts.length ? roundToDecimal(averageArray(amounts), 2) : 0,
      earningsVolatility: amounts.length ? roundToDecimal(standardDeviation(amounts), 2) : 0,
      totalEarnings: roundToDecimal(earnings.reduce((sum, e) => sum + parseFloat(e.total_earned), 0), 2),
    };

    logger.info('Earnings trends retrieved', { driverId, period, currency });
    return { trends: result, metrics, currency };
  } catch (error) {
    throw handleServiceError('getEarningsTrends', error, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function getFinancialSummary(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  try {
    const summaries = await FinancialSummary.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
    });

    const latestSummary = summaries[0] || {
      total_earnings: 0,
      total_payouts: 0,
      total_taxes: 0,
      currency,
      period: 'monthly',
    };

    const summary = {
      driverId,
      totalEarnings: roundToDecimal(parseFloat(latestSummary.total_earnings), 2),
      totalPayouts: roundToDecimal(parseFloat(latestSummary.total_payouts), 2),
      totalTaxes: roundToDecimal(parseFloat(latestSummary.total_taxes), 2),
      currency,
      period: latestSummary.period,
    };

    logger.info('Financial summary retrieved', { driverId, period: summary.period, currency });
    return summary;
  } catch (error) {
    throw handleServiceError('getFinancialSummary', error, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function recommendFinancialGoals(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES,
        created_at: { [Op.gte]: subtractDaysFromDate(new Date(), 30) },
      },
    });

    const monthlyEarnings = roundToDecimal(
      transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
      2
    );
    const recommendedGoal = roundToDecimal(monthlyEarnings * 1.2, 2);
    const highDemandRecommendation = driverWalletConstants.WALLET_CONSTANTS.FINANCIAL_ANALYTICS.METRICS.includes('earnings_trends')
      ? 'Target high-demand periods like lunch_rush or evening_rush.'
      : 'Increase weekly shifts by 10%.';

    const goals = {
      driverId,
      monthlyEarningsGoal: recommendedGoal,
      currentEarnings: monthlyEarnings,
      currency,
      recommendation: highDemandRecommendation,
    };

    logger.info('Financial goals recommended', { driverId, monthlyEarningsGoal: recommendedGoal, currency });
    return goals;
  } catch (error) {
    throw handleServiceError('recommendFinancialGoals', error, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function compareFinancialPerformance(driverId, peers, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!['city', 'country'].includes(peers)) {
    throw new AppError('Invalid peer group', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  try {
    const driverSummary = await FinancialSummary.findOne({
      where: { driver_id: driverId, period: 'monthly' },
    });

    const peerFilter = peers === 'city' ? { city: driver.city } : { country: driver.country };
    const peerSummaries = await FinancialSummary.findAll({
      where: { period: 'monthly' },
      include: [{ model: Driver, as: 'driver', where: peerFilter }],
    });

    const driverEarnings = driverSummary ? roundToDecimal(parseFloat(driverSummary.total_earnings), 2) : 0;
    const peerAvgEarnings = peerSummaries.length
      ? roundToDecimal(
          peerSummaries.reduce((sum, s) => sum + parseFloat(s.total_earnings), 0) / peerSummaries.length,
          2
        )
      : 0;

    const comparison = {
      driverId,
      driverEarnings,
      peerAverageEarnings: peerAvgEarnings,
      peerGroup: peers,
      currency,
      performance: driverEarnings > peerAvgEarnings ? 'above_average' : 'below_average',
    };

    logger.info('Financial performance compared', { driverId, peers, currency });
    return comparison;
  } catch (error) {
    throw handleServiceError('compareFinancialPerformance', error, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function analyzeTransactionSuccessRate(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.FINANCIAL_ANALYTICS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const dateFilter = {};
  const now = new Date();
  if (period === 'daily') dateFilter[Op.gte] = getStartOfDay(now);
  else if (period === 'weekly') dateFilter[Op.gte] = subtractDaysFromDate(now, 7);
  else if (period === 'monthly') dateFilter[Op.gte] = subtractDaysFromDate(now, 30);
  else if (period === 'yearly') dateFilter[Op.gte] = subtractDaysFromDate(now, 365);

  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        created_at: dateFilter,
      },
    });

    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(t => t.status === paymentConstants.TRANSACTION_STATUSES.COMPLETED).length;
    const successRate = totalTransactions ? roundToDecimal((successfulTransactions / totalTransactions) * 100, 2) : 0;

    logger.info('Transaction success rate analyzed', { driverId, period, successRate, currency });
    return {
      driverId,
      period,
      totalTransactions,
      successfulTransactions,
      successRate,
      currency,
    };
  } catch (error) {
    throw handleServiceError('analyzeTransactionSuccessRate', error, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

async function forecastEarnings(driverId, period = 'monthly', currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.FINANCIAL_ANALYTICS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: driverWalletConstants.WALLET_CONSTANTS.WALLET_TYPE },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  try {
    const earnings = await DriverEarnings.findAll({
      where: {
        driver_id: driverId,
        created_at: { [Op.gte]: subtractDaysFromDate(new Date(), period === 'monthly' ? 90 : 30) },
      },
    });

    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.total_earned), 0);
    const avgDailyEarnings = earnings.length ? roundToDecimal(totalEarnings / (period === 'monthly' ? 90 : 30), 2) : 0;
    const forecast = period === 'monthly' ? roundToDecimal(avgDailyEarnings * 30, 2) : roundToDecimal(avgDailyEarnings * 7, 2);

    logger.info('Earnings forecast generated', { driverId, period, forecast, currency });
    return {
      driverId,
      period,
      forecastedEarnings: forecast,
      currency,
      basis: `Based on ${period === 'monthly' ? '90-day' : '30-day'} historical earnings`,
    };
  } catch (error) {
    throw handleServiceError('forecastEarnings', error, driverConstants.ERROR_CODES.DELIVERY_FAILED);
  }
}

module.exports = {
  getEarningsTrends,
  getFinancialSummary,
  recommendFinancialGoals,
  compareFinancialPerformance,
  analyzeTransactionSuccessRate,
  forecastEarnings,
};