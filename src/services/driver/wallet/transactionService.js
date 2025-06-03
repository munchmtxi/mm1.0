'use strict';

/**
 * Driver Transaction Service
 * Manages driver wallet transaction operations, including recording transactions,
 * retrieving history, reversing transactions, and exporting data.
 */

const { Wallet, WalletTransaction, Driver, sequelize } = require('@models');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');

/**
 * Records a wallet transaction for a driver.
 * @param {number} driverId - Driver ID.
 * @param {number} taskId - Order or Ride ID.
 * @param {number} amount - Transaction amount.
 * @param {string} type - Transaction type (earning, tip, payout, refund).
 * @returns {Promise<Object>} Created transaction.
 */
async function recordTransaction(driverId, taskId, amount, type) {
  if (!Object.values(driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES).includes(type)) {
    throw new AppError('Invalid transaction type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (amount < paymentConstants.FINANCIAL_LIMITS[type.toUpperCase()]?.MIN_AMOUNT ||
      amount > paymentConstants.FINANCIAL_LIMITS[type.toUpperCase()]?.MAX_AMOUNT) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const walletTransaction = await WalletTransaction.create({
      wallet_id: wallet.id,
      type,
      amount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Transaction for task #${taskId} (${type})`,
    }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'RECORD_TRANSACTION',
      details: { driverId, taskId, amount, type, transactionId: walletTransaction.id },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[type === 'tip' ? 'TIP_RECEIVED' : 'DEPOSIT_CONFIRMED'],
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `transaction.${type}_recorded`,
        { amount, taskId, currency: wallet.currency }
      ),
      priority: 'MEDIUM',
    });

    await transaction.commit();
    logger.info('Transaction recorded', { driverId, transactionId: walletTransaction.id });
    return walletTransaction;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Record transaction failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Retrieves driver's transaction history.
 * @param {number} driverId - Driver ID.
 * @param {string} period - Period (daily, weekly, monthly, yearly).
 * @returns {Promise<Array<Object>>} Transaction records.
 */
async function getTransactionHistory(driverId, period) {
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
    where: { wallet_id: wallet.id, created_at: dateFilter },
    order: [['created_at', 'DESC']],
  });

  logger.info('Transaction history retrieved', { driverId, period });
  return transactions.map(t => ({
    transactionId: t.id,
    type: t.type,
    amount: parseFloat(t.amount),
    currency: t.currency,
    status: t.status,
    description: t.description,
    created_at: t.created_at,
  }));
}

/**
 * Reverses a transaction (refund/cancel).
 * @param {number} driverId - Driver ID.
 * @param {number} transactionId - Transaction ID.
 * @returns {Promise<void>}
 */
async function reverseTransaction(driverId, transactionId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transactionRecord = await WalletTransaction.findByPk(transactionId);
  if (!transactionRecord || transactionRecord.wallet_id !== wallet.id) {
    throw new AppError('Transaction not found', 404, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
  if (transactionRecord.status === paymentConstants.TRANSACTION_STATUSES.REFUNDED) {
    throw new AppError('Transaction already refunded', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const transaction = await sequelize.transaction();
  try {
    const amount = parseFloat(transactionRecord.amount);
    const newBalance = parseFloat(wallet.balance) - amount;
    if (newBalance < paymentConstants.WALLET_SETTINGS.MIN_BALANCE) {
      throw new AppError('Insufficient funds for refund', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
    }

    await wallet.update({ balance: newBalance }, { transaction });
    await transactionRecord.update({ status: paymentConstants.TRANSACTION_STATUSES.REFUNDED }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'REVERSE_TRANSACTION',
      details: { driverId, transactionId, amount },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TRANSACTION_FAILED,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'transaction.reversed',
        { transactionId, amount, currency: wallet.currency }
      ),
      priority: 'HIGH',
    });

    await transaction.commit();
    logger.info('Transaction reversed', { driverId, transactionId });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Reverse transaction failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Exports transaction data in specified format.
 * @param {number} driverId - Driver ID.
 * @param {string} format - Export format (csv, json).
 * @returns {Promise<string>} Exported data.
 */
async function exportTransactionData(driverId, format) {
  if (!['csv', 'json'].includes(format)) {
    throw new AppError('Invalid format', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const transactions = await WalletTransaction.findAll({
    where: { wallet_id: wallet.id },
    order: [['created_at', 'DESC']],
  });

  const data = transactions.map(t => ({
    transactionId: t.id,
    type: t.type,
    amount: parseFloat(t.amount),
    currency: t.currency,
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

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'EXPORT_TRANSACTIONS',
    details: { driverId, format },
    ipAddress: 'unknown',
  });

  logger.info('Transaction data exported', { driverId, format });
  return result;
}

module.exports = {
  recordTransaction,
  getTransactionHistory,
  reverseTransaction,
  exportTransactionData,
};