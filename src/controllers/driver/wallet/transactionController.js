'use strict';

const transactionService = require('@services/driver/wallet/transactionService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function recordTransaction(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { taskId, amount, type } = req.body;
    const transaction = await transactionService.recordTransaction(
      driverId,
      taskId,
      amount,
      type,
      auditService,
      notificationService,
      socketService,
      pointService
    );

    res.status(200).json({
      status: 'success',
      data: transaction,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `transaction.${type}_recorded`,
        { amount, taskId, currency: transaction.currency }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getTransactionHistory(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { period } = req.query;
    const transactions = await transactionService.getTransactionHistory(
      driverId,
      period,
      auditService,
      socketService,
      pointService
    );

    res.status(200).json({
      status: 'success',
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
}

async function reverseTransaction(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { transactionId } = req.body;
    const result = await transactionService.reverseTransaction(
      driverId,
      transactionId,
      auditService,
      notificationService,
      socketService,
      pointService
    );

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'transaction.reversed',
        { transactionId, amount: result.amount, currency: result.currency || 'USD' }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function exportTransactionData(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { format } = req.query;
    const data = await transactionService.exportTransactionData(
      driverId,
      format,
      auditService,
      socketService,
      pointService
    );

    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=transactions.${format}`);
    res.status(200).send(data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  recordTransaction,
  getTransactionHistory,
  reverseTransaction,
  exportTransactionData,
};