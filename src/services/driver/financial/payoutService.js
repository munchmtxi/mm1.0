'use strict';

const { Driver, Wallet, Payout, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverGamificationConstants = require('@constants/driver/driverGamificationConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const payoutConstants = require('@constants/payoutConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function requestPayout(driverId, amount, method, { pointService, auditService, notificationService, socketService }) {
  if (!payoutConstants.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }
  if (amount < payoutConstants.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT || amount > payoutConstants.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT) {
    throw new AppError('Invalid payout amount', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_AMOUNT);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
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

    const payout = await Payout.create({
      driver_id: driverId,
      wallet_id: wallet.id,
      amount,
      currency: wallet.currency,
      method,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
    }, { transaction });

    const newBalance = parseFloat(wallet.balance) - amount;
    await wallet.update({ balance: newBalance }, { transaction });

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: payoutConstants.AUDIT_TYPES.REQUEST_PAYOUT,
        details: { driverId, amount, method, payoutId: payout.id },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'payout_request',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'payout_request').points,
      { action: `Requested payout of ${amount} via ${method}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: payoutConstants.NOTIFICATION_TYPES.PAYOUT_REQUESTED,
        message: formatMessage(
          'driver',
          'financial',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'payout.requested',
          { amount, currency: wallet.currency, method }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, payoutConstants.EVENT_TYPES.PAYOUT_REQUESTED, {
      payoutId: payout.id,
      amount,
      method,
    });

    await transaction.commit();
    logger.info('Payout requested', { driverId, payoutId: payout.id, amount, method });
    return payout;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Payout request failed: ${error.message}`, 500, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function getPayoutHistory(driverId, { pointService, auditService, notificationService, socketService }) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const payouts = await Payout.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
      include: [{ model: Wallet, as: 'wallet', attributes: ['id', 'currency'] }],
      transaction,
    });

    const result = payouts.map(p => ({
      payoutId: p.id,
      amount: parseFloat(p.amount),
      currency: p.currency,
      method: p.method,
      status: p.status,
      created_at: p.created_at,
    }));

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: payoutConstants.AUDIT_TYPES.GET_PAYOUT_HISTORY,
        details: { driverId, payoutCount: payouts.length },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const today = new Date().toISOString().split('T')[0];
    const existingPoints = await pointService.getPointsHistory(driverId, 'payout_history_access', {
      startDate: new Date(today),
      endDate: new Date(today + 'T23:59:59.999Z'),
    });
    if (!existingPoints.length) {
      await pointService.awardPoints(
        driverId,
        'payout_history_access',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'payout_history_access').points,
        { action: 'Accessed payout history' },
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
          'payout.history_viewed',
          { count: payouts.length }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, payoutConstants.EVENT_TYPES.PAYOUT_HISTORY_RETRIEVED, { driverId, payouts: result });

    await transaction.commit();
    logger.info('Payout history retrieved', { driverId });
    return result;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Payout history retrieval failed: ${error.message}`, 500, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function verifyPayoutMethod(driverId, method, { pointService, auditService, notificationService, socketService }) {
  if (!payoutConstants.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const isVerified = true; // Simulate verification (e.g., Stripe API, bank validation)

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: payoutConstants.AUDIT_TYPES.VERIFY_PAYOUT_METHOD,
        details: { driverId, method, isVerified },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'payout_method_verify',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'payout_method_verify').points,
      { action: `Verified payout method ${method}` },
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
          'payout.method_verified',
          { method }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, payoutConstants.EVENT_TYPES.PAYOUT_METHOD_VERIFIED, { driverId, method, isVerified });

    await transaction.commit();
    logger.info('Payout method verified', { driverId, method, isVerified });
    return isVerified;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Payout method verification failed: ${error.message}`, 500, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

async function scheduleRecurringPayout(driverId, schedule, { pointService, auditService, notificationService, socketService }) {
  const { frequency, amount, method } = schedule;
  if (!payoutConstants.SUPPORTED_FREQUENCIES.includes(frequency)) {
    throw new AppError('Invalid payout frequency', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }
  if (amount < payoutConstants.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT || amount > payoutConstants.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT) {
    throw new AppError('Invalid payout amount', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_AMOUNT);
  }
  if (!payoutConstants.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, payoutConstants.ERROR_CODES.INVALID_PAYOUT_METHOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: payoutConstants.AUDIT_TYPES.SCHEDULE_RECURRING_PAYOUT,
        details: { driverId, frequency, amount, method },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'payout_schedule',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'payout_schedule').points,
      { action: `Scheduled recurring payout of ${amount} ${frequency} via ${method}` },
      transaction
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: payoutConstants.NOTIFICATION_TYPES.PAYOUT_SCHEDULED,
        message: formatMessage(
          'driver',
          'financial',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'payout.scheduled',
          { frequency, amount, method }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, payoutConstants.EVENT_TYPES.PAYOUT_SCHEDULED, { driverId, frequency, amount, method });

    await transaction.commit();
    logger.info('Recurring payout scheduled', { driverId, frequency, amount, method });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Recurring payout scheduling failed: ${error.message}`, 500, payoutConstants.ERROR_CODES.PAYOUT_FAILED);
  }
}

module.exports = {
  requestPayout,
  getPayoutHistory,
  verifyPayoutMethod,
  scheduleRecurringPayout,
};