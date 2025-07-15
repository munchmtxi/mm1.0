'use strict';

const { Wallet, WalletTransaction, Driver, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');

async function recordTransaction(driverId, taskId, amount, type, auditService, notificationService, socketService, pointService) {
  if (!driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.includes(type)) {
    throw new AppError('Invalid transaction type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  const typeUpper = type.toUpperCase();
  const limits = paymentConstants.FINANCIAL_LIMITS.find(l => l.type === typeUpper);
  if (!limits || amount < limits.min || amount > limits.max) {
    throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  const transaction = await sequelize.transaction();
  try {
    const walletTransaction = await WalletTransaction.create({
      wallet_id: wallet.id,
      type,
      amount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
      description: `Transaction for task #${taskId} (${type})`,
    }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'RECORD_TRANSACTION',
      details: { driverId, taskId, amount, type, transactionId: walletTransaction.id },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[type === 'tip' ? 'TIP_RECEIVED' : 'DEPOSIT_CONFIRMED'],
      message: formatMessage(
        'driver',
        'wallet',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `transaction.${type}_recorded`,
        { amount, taskId, currency: wallet.currency }
      ),
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === `transaction_${type}_recorded`).action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'transaction:recorded', {
      driverId,
      taskId,
      amount,
      type,
      transactionId: walletTransaction.id,
    });

    await transaction.commit();
    logger.info('Transaction recorded', { driverId, transactionId: walletTransaction.id });
    return {
      transactionId: walletTransaction.id,
      type,
      amount: parseFloat(walletTransaction.amount),
      currency: walletTransaction.currency,
      status: walletTransaction.status,
      description: walletTransaction.description,
      created_at: walletTransaction.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Record transaction failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

async function getTransactionHistory(driverId, period, auditService, socketService, pointService) {
  if (!paymentConstants.ANALYTICS_CONSTANTS.REPORT_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  const dateFilter = {};
  const now = new Date();
  if (period === 'daily') dateFilter[Op.gte] = new Date(now.setHours(0, 0, 0, 0));
  else if (period === 'weekly') dateFilter[Op.gte] = new Date(now.setDate(now.getDate() - 7));
  else if (period === 'monthly') dateFilter[Op.gte] = new Date(now.setMonth(now.getMonth() - 1));
  else if (period === 'yearly') dateFilter[Op.gte] = new Date(now.setFullYear(now.getFullYear() - 1));

  const transaction = await sequelize.transaction();
  try {
    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: wallet.id, created_at: dateFilter },
      order: [['created_at', 'DESC']],
      transaction,
    });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'GET_TRANSACTION_HISTORY',
      details: { driverId, period, transactionCount: transactions.length },
      ipAddress: 'unknown',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'transaction_history_view').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'transaction:history_viewed', {
      driverId,
      period,
      transactionCount: transactions.length,
    });

    await transaction.commit();
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
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get transaction history failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

async function reverseTransaction(driverId, transactionId, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  const transactionRecord = await WalletTransaction.findByPk(transactionId);
  if (!transactionRecord || transactionRecord.wallet_id !== wallet.id) {
    throw new AppError('Transaction not found', 404, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
  if (transactionRecord.status === paymentConstants.TRANSACTION_STATUSES[3]) { // 'rejected'
    throw new AppError('Transaction already refunded', 400, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }

  const transaction = await sequelize.transaction();
  try {
    const amount = parseFloat(transactionRecord.amount);
    const newBalance = parseFloat(wallet.balance) - amount;
    if (newBalance < paymentConstants.WALLET_SETTINGS.MIN_BALANCE) {
      throw new AppError('Insufficient funds for refund', 400, paymentConstants.ERROR_CODES[1]); // 'INSUFFICIENT_FUNDS'
    }

    await wallet.update({ balance: newBalance }, { transaction });
    await transactionRecord.update({ status: paymentConstants.TRANSACTION_STATUSES[3] }, { transaction }); // 'rejected'

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'REVERSE_TRANSACTION',
      details: { driverId, transactionId, amount },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SOCIAL_BILL_SPLIT_COMPLETED,
      message: formatMessage(
        'driver',
        'wallet',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'transaction.reversed',
        { transactionId, amount, currency: wallet.currency }
      ),
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'transaction_reversed').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'transaction:reversed', {
      driverId,
      transactionId,
      amount,
    });

    await transaction.commit();
    logger.info('Transaction reversed', { driverId, transactionId });
    return {
      transactionId,
      amount,
      newBalance,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Reverse transaction failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

async function exportTransactionData(driverId, format, auditService, socketService, pointService) {
  if (!['csv', 'json'].includes(format)) {
    throw new AppError('Invalid format', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  const transaction = await sequelize.transaction();
  try {
    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      order: [['created_at', 'DESC']],
      transaction,
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
      details: { driverId, format, transactionCount: transactions.length },
      ipAddress: 'unknown',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'transaction_export').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'transaction:exported', {
      driverId,
      format,
      transactionCount: transactions.length,
    });

    await transaction.commit();
    logger.info('Transaction data exported', { driverId, format });
    return result;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Export transaction data failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

module.exports = {
  recordTransaction,
  getTransactionHistory,
  reverseTransaction,
  exportTransactionData,
};