'use strict';

const { Wallet, WalletTransaction, Driver, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverWalletConstants = require('@constants/driver/driverWalletConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal } = require('@utils/mathUtils');
const { getStartOfDay, subtractDaysFromDate } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');

async function recordTransaction(driverId, taskId, amount, type, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.includes(type)) {
    throw new AppError('Invalid transaction type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const typeUpper = type.toUpperCase();
  const limits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === typeUpper);
  if (!limits || amount < limits.min || amount > limits.max) {
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

  const transaction = await sequelize.transaction();
  try {
    const walletTransaction = await WalletTransaction.create({
      wallet_id: wallet.id,
      type,
      amount: roundToDecimal(amount, 2),
      currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Transaction for task #${taskId} (${type})`,
    }, { transaction });

    await transaction.commit();
    logger.info('Transaction recorded', { driverId, transactionId: walletTransaction.id, currency });
    return {
      transactionId: walletTransaction.id,
      type,
      amount: roundToDecimal(parseFloat(walletTransaction.amount), 2),
      currency,
      status: walletTransaction.status,
      description: walletTransaction.description,
      created_at: walletTransaction.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('recordTransaction', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function getTransactionHistory(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
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
      where: { wallet_id: wallet.id, created_at: dateFilter },
      order: [['created_at', 'DESC']],
    });

    logger.info('Transaction history retrieved', { driverId, period, currency });
    return transactions.map(t => ({
      transactionId: t.id,
      type: t.type,
      amount: roundToDecimal(parseFloat(t.amount), 2),
      currency,
      status: t.status,
      description: t.description,
      created_at: t.created_at,
    }));
  } catch (error) {
    throw handleServiceError('getTransactionHistory', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function reverseTransaction(driverId, transactionId, currency = localizationConstants.DEFAULT_CURRENCY) {
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

  const transactionRecord = await WalletTransaction.findByPk(transactionId);
  if (!transactionRecord || transactionRecord.wallet_id !== wallet.id) {
    throw new AppError('Transaction not found', 404, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
  if (transactionRecord.status === paymentConstants.TRANSACTION_STATUSES.REJECTED) {
    throw new AppError('Transaction already refunded', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const transaction = await sequelize.transaction();
  try {
    const amount = parseFloat(transactionRecord.amount);
    const newBalance = roundToDecimal(parseFloat(wallet.balance) - amount, 2);
    if (newBalance < paymentConstants.WALLET_SETTINGS.MIN_BALANCE) {
      throw new AppError('Insufficient funds for refund', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

    await wallet.update({ balance: newBalance }, { transaction });
    await transactionRecord.update({ status: paymentConstants.TRANSACTION_STATUSES.REJECTED }, { transaction });

    await transaction.commit();
    logger.info('Transaction reversed', { driverId, transactionId, currency });
    return {
      transactionId,
      amount: roundToDecimal(amount, 2),
      newBalance,
      currency,
    };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('reverseTransaction', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function exportTransactionData(driverId, format, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!['csv', 'json'].includes(format)) {
    throw new AppError('Invalid format', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
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
    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      order: [['created_at', 'DESC']],
    });

    const data = transactions.map(t => ({
      transactionId: t.id,
      type: t.type,
      amount: roundToDecimal(parseFloat(t.amount), 2),
      currency,
      status: t.status,
      description: t.description,
      created_at: t.created_at.toISOString(),
    }));

    let result;
    if (format === 'csv') {
      const fields = ['transactionId', 'type', 'amount', 'currency', 'status', 'description', 'created_at'];
      const parser = new Parser({ fields });
      result = parser.parse(data);
    } else {
      result = JSON.stringify(data, null, 2);
    }

    logger.info('Transaction data exported', { driverId, format, currency });
    return result;
  } catch (error) {
    throw handleServiceError('exportTransactionData', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function calculateTransactionFees(driverId, amount, type, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!driverWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.includes(type)) {
    throw new AppError('Invalid transaction type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const platformFee = roundToDecimal(amount * 0.1, 2); // Mock 10% platform fee
    const processingFee = roundToDecimal(amount * 0.02, 2); // Mock 2% processing fee
    const netAmount = roundToDecimal(amount - platformFee - processingFee, 2);

    logger.info('Transaction fees calculated', { driverId, type, platformFee, processingFee, currency });
    return {
      driverId,
      type,
      amount,
      platformFee,
      processingFee,
      netAmount,
      currency,
    };
  } catch (error) {
    throw handleServiceError('calculateTransactionFees', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

async function aggregateTransactionMetrics(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
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
      where: { wallet_id: wallet.id, created_at: dateFilter },
    });

    const totalAmount = roundToDecimal(
      transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
      2
    );
    const transactionCount = transactions.length;
    const successRate = transactionCount
      ? roundToDecimal(
          (transactions.filter(t => t.status === paymentConstants.TRANSACTION_STATUSES.COMPLETED).length / transactionCount) * 100,
          2
        )
      : 0;

    logger.info('Transaction metrics aggregated', { driverId, period, totalAmount, currency });
    return {
      driverId,
      period,
      totalAmount,
      transactionCount,
      successRate,
      currency,
    };
  } catch (error) {
    throw handleServiceError('aggregateTransactionMetrics', error, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

module.exports = {
  recordTransaction,
  getTransactionHistory,
  reverseTransaction,
  exportTransactionData,
  calculateTransactionFees,
  aggregateTransactionMetrics,
};