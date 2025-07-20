'use strict';

const { Driver, Wallet, WalletTransaction, DriverEarnings, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverWalletConstants = require('@constants/driver/driverWalletConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const driverRevenueStreamConstants = require('@constants/driver/driverRevenueStreamConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal } = require('@utils/mathUtils');
const { getStartOfDay, subtractDaysFromDate } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function calculateRevenue(driverId, serviceType, amount, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!['mtxi', 'munch', 'mevents'].includes(serviceType.toLowerCase())) {
    throw new AppError('Invalid service type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }
  if (amount <= 0) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
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

  const serviceConfig = driverRevenueStreamConstants.DRIVER_REVENUE_STREAMS[serviceType.toUpperCase()];
  if (!serviceConfig) {
    throw new AppError('Service configuration not found', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    const isPremium = serviceType.toLowerCase() === 'mtxi' && amount > 100; // Example condition for premium rides
    const commissionRate = isPremium
      ? serviceConfig.DRIVER_EARNINGS.PREMIUM_RIDE_SHARE / 100
      : serviceConfig.DRIVER_EARNINGS.BASE_SHARE / 100;
    const commission = roundToDecimal(amount * (1 - commissionRate), 2);
    const processingFee = roundToDecimal(amount * serviceConfig.DRIVER_EARNINGS.DEDUCTIONS.DRIVER_PROCESSING_FEE, 2);
    const netAmount = roundToDecimal(amount - commission - processingFee, 2);

    const taxRate = driverRevenueStreamConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country || 'US']?.VAT || 0;
    const taxAmount = roundToDecimal(netAmount * taxRate, 2);
    const finalAmount = roundToDecimal(netAmount - taxAmount, 2);

    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: serviceConfig.DRIVER_EARNINGS.TRANSACTION_TYPES[0],
      amount: finalAmount,
      currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `${serviceType} revenue after deductions`,
    }, { transaction });

    await DriverEarnings.create({
      driver_id: driverId,
      total_earned: finalAmount,
      currency,
      service_type: serviceType.toLowerCase(),
    }, { transaction });

    await transaction.commit();
    logger.info('Revenue calculated', { driverId, serviceType, finalAmount, currency });
    return {
      driverId,
      serviceType,
      grossAmount: amount,
      commission,
      processingFee,
      taxAmount,
      netAmount: finalAmount,
      currency,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('calculateRevenue', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function manageSubscription(driverId, planName, paymentMethod, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverRevenueStreamConstants.ADDITIONAL_COSTS.DRIVER_SUBSCRIPTION.PLANS.some(p => p.NAME === planName)) {
    throw new AppError('Invalid subscription plan', 400, driverRevenueStreamConstants.ERROR_CODES.INVALID_SUBSCRIPTION_PLAN);
  }
  if (!driverRevenueStreamConstants.ADDITIONAL_COSTS.DRIVER_SUBSCRIPTION.PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
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

  const plan = driverRevenueStreamConstants.ADDITIONAL_COSTS.DRIVER_SUBSCRIPTION.PLANS.find(p => p.NAME === planName);
  const subscriptionFee = plan.PRICE[driver.country || 'US'] || plan.PRICE.US;

  if (parseFloat(wallet.balance) < subscriptionFee) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  const transaction = await sequelize.transaction();
  try {
    const newBalance = roundToDecimal(parseFloat(wallet.balance) - subscriptionFee, 2);
    await wallet.update({ balance: newBalance }, { transaction });

    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: 'subscription',
      amount: -subscriptionFee,
      currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `${planName} subscription payment`,
    }, { transaction });

    await transaction.commit();
    logger.info('Subscription managed', { driverId, planName, subscriptionFee, currency });
    return {
      driverId,
      planName,
      subscriptionFee,
      currency,
      status: driverRevenueStreamConstants.ADDITIONAL_COSTS.DRIVER_SUBSCRIPTION.PAYMENT_STATUSES[1], // completed
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('manageSubscription', error, paymentConstants.ERROR_CODES.PAYMENT_FAILED);
  }
}

async function analyzeRevenuePerformance(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
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

  const dateFilter = {};
  const now = new Date();
  if (period === 'daily') dateFilter[Op.gte] = getStartOfDay(now);
  else if (period === 'weekly') dateFilter[Op.gte] = subtractDaysFromDate(now, 7);
  else if (period === 'monthly') dateFilter[Op.gte] = subtractDaysFromDate(now, 30);
  else if (period === 'yearly') dateFilter[Op.gte] = subtractDaysFromDate(now, 365);

  try {
    const earnings = await DriverEarnings.findAll({
      where: { driver_id: driverId, created_at: dateFilter },
    });

    const revenueByService = earnings.reduce((acc, e) => {
      acc[e.service_type] = (acc[e.service_type] || 0) + parseFloat(e.total_earned);
      return acc;
    }, { mtxi: 0, munch: 0, mevents: 0 });

    const totalRevenue = roundToDecimal(
      Object.values(revenueByService).reduce((sum, val) => sum + val, 0),
      2
    );
    const metrics = {
      mtxi: {
        revenue: roundToDecimal(revenueByService.mtxi, 2),
        share: totalRevenue ? roundToDecimal((revenueByService.mtxi / totalRevenue) * 100, 2) : 0,
      },
      munch: {
        revenue: roundToDecimal(revenueByService.munch, 2),
        share: totalRevenue ? roundToDecimal((revenueByService.munch / totalRevenue) * 100, 2) : 0,
      },
      mevents: {
        revenue: roundToDecimal(revenueByService.mevents, 2),
        share: totalRevenue ? roundToDecimal((revenueByService.mevents / totalRevenue) * 100, 2) : 0,
      },
    };

    logger.info('Revenue performance analyzed', { driverId, period, totalRevenue, currency });
    return { driverId, period, totalRevenue, metrics, currency };
  } catch (error) {
    throw handleServiceError('analyzeRevenuePerformance', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

module.exports = {
  calculateRevenue,
  manageSubscription,
  analyzeRevenuePerformance,
};