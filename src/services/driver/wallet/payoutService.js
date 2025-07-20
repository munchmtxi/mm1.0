'use strict';

const { Driver, Wallet, Payout, WalletTransaction, Payment, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverWalletConstants = require('@constants/driver/driverWalletConstants');
const payoutConstants = require('@constants/driver/payoutConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal } = require('@utils/mathUtils');
const { getStartOfDay, subtractDaysFromDate } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function requestPayout(driverId, amount, method, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }
  if (
    amount < payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.MIN_PAYOUT_THRESHOLD ||
    amount > payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.MAX_PAYOUT_THRESHOLD
  ) {
    throw new AppError('Invalid payout amount', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_AMOUNT);
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
  if (parseFloat(wallet.balance) < amount) {
    throw new AppError('Insufficient funds', 400, payoutConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  const transaction = await sequelize.transaction();
  try {
    const recentPayouts = await Payout.count({
      where: {
        driver_id: driverId,
        created_at: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) },
      },
      transaction,
    });
    if (recentPayouts >= paymentConstants.FINANCIAL_LIMITS.find(l => l.type === 'WITHDRAWAL').max_attempts_per_hour) {
      throw new AppError('Withdrawal attempts exceeded', 429, payoutConstants.ERROR_CODES.WITHDRAWAL_ATTEMPTS_EXCEEDED);
    }

    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country]?.VAT || 0;
    const taxAmount = roundToDecimal(amount * taxRate, 2);
    const netAmount = roundToDecimal(amount - taxAmount, 2);

    const payout = await Payout.create({
      driver_id: driverId,
      wallet_id: wallet.id,
      amount: netAmount,
      currency,
      method,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
    }, { transaction });

    const newBalance = roundToDecimal(parseFloat(wallet.balance) - amount, 2);
    await wallet.update({ balance: newBalance }, { transaction });

    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[3], // payout
      amount: netAmount,
      currency,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
      description: `Payout requested via ${method}`,
    }, { transaction });

    await Payment.create({
      driver_id: driverId,
      amount: netAmount,
      payment_method: method,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
      currency,
      transaction_id: `PO-${payout.id}`,
    }, { transaction });

    await transaction.commit();
    logger.info('Payout requested', { driverId, payoutId: payout.id, amount, method, currency });
    return { payoutId: payout.id, amount: netAmount, currency, method, taxAmount };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('requestPayout', error, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function getPayoutHistory(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const payouts = await Payout.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
      include: [{ model: Wallet, as: 'wallet', attributes: ['id', 'currency'] }],
    });

    const result = payouts.map(p => ({
      payoutId: p.id,
      amount: roundToDecimal(parseFloat(p.amount), 2),
      currency: p.currency,
      method: p.method,
      status: p.status,
      created_at: p.created_at,
      taxAmount: roundToDecimal(parseFloat(p.amount) * (payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country]?.VAT || 0), 2),
    }));

    logger.info('Payout history retrieved', { driverId, payoutCount: payouts.length, currency });
    return result;
  } catch (error) {
    throw handleServiceError('getPayoutHistory', error, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function verifyPayoutMethod(driverId, method) {
  if (!payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const isVerified = true; // Simulate verification (e.g., Stripe API, bank validation)
    logger.info('Payout method verified', { driverId, method, isVerified });
    return { driverId, method, isVerified };
  } catch (error) {
    throw handleServiceError('verifyPayoutMethod', error, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function scheduleRecurringPayout(driverId, schedule, currency = localizationConstants.DEFAULT_CURRENCY) {
  const { frequency, amount, method } = schedule;
  if (!payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_FREQUENCIES.includes(frequency)) {
    throw new AppError('Invalid payout frequency', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }
  if (
    amount < payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.MIN_PAYOUT_THRESHOLD ||
    amount > payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.MAX_PAYOUT_THRESHOLD
  ) {
    throw new AppError('Invalid payout amount', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_AMOUNT);
  }
  if (!payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    logger.info('Recurring payout scheduled', { driverId, frequency, amount, method, currency });
    return { driverId, frequency, amount, method, currency, status: 'scheduled' };
  } catch (error) {
    throw handleServiceError('scheduleRecurringPayout', error, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function autoPayoutCheck(driverId, method, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
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

  const autoPayoutThreshold = payoutConstants.DRIVER_REVENUE_SETTINGS.PAYOUT_SCHEDULE.AUTO_PAYOUT_THRESHOLD;
  if (parseFloat(wallet.balance) < autoPayoutThreshold) {
    logger.info('Auto-payout threshold not met', { driverId, balance: wallet.balance, threshold: autoPayoutThreshold });
    return { driverId, status: 'threshold_not_met', balance: roundToDecimal(parseFloat(wallet.balance), 2), currency };
  }

  const transaction = await sequelize.transaction();
  try {
    const amount = roundToDecimal(parseFloat(wallet.balance), 2);
    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country]?.VAT || 0;
    const taxAmount = roundToDecimal(amount * taxRate, 2);
    const netAmount = roundToDecimal(amount - taxAmount, 2);

    const payout = await Payout.create({
      driver_id: driverId,
      wallet_id: wallet.id,
      amount: netAmount,
      currency,
      method,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
    }, { transaction });

    const newBalance = roundToDecimal(parseFloat(wallet.balance) - amount, 2);
    await wallet.update({ balance: newBalance }, { transaction });

    await WalletTransaction.create({
      wallet_id: wallet.id,
      type: driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[3], // payout
      amount: netAmount,
      currency,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
      description: `Auto-payout triggered via ${method}`,
    }, { transaction });

    await Payment.create({
      driver_id: driverId,
      amount: netAmount,
      payment_method: method,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
      currency,
      transaction_id: `APO-${payout.id}`,
    }, { transaction });

    await transaction.commit();
    logger.info('Auto-payout triggered', { driverId, payoutId: payout.id, amount, method, currency });
    return { payoutId: payout.id, amount: netAmount, currency, method, taxAmount, status: 'initiated' };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('autoPayoutCheck', error, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function getPayoutTaxSummary(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
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
    const payouts = await Payout.findAll({
      where: {
        driver_id: driverId,
        created_at: dateFilter,
      },
    });

    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country]?.VAT || 0;
    const taxSummary = payouts.reduce((acc, p) => {
      const taxAmount = roundToDecimal(parseFloat(p.amount) * taxRate, 2);
      acc.totalTax += taxAmount;
      acc.payouts.push({ payoutId: p.id, amount: roundToDecimal(parseFloat(p.amount), 2), taxAmount });
      return acc;
    }, { totalTax: 0, payouts: [], currency });

    logger.info('Payout tax summary retrieved', { driverId, period, totalTax: taxSummary.totalTax, currency });
    return taxSummary;
  } catch (error) {
    throw handleServiceError('getPayoutTaxSummary', error, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

module.exports = {
  requestPayout,
  getPayoutHistory,
  verifyPayoutMethod,
  scheduleRecurringPayout,
  autoPayoutCheck,
  getPayoutTaxSummary,
};