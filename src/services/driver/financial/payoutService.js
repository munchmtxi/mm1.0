'use strict';

/**
 * Driver Payout Service
 * Manages driver payout operations, including requesting payouts,
 * retrieving history, verifying methods, and scheduling recurring payouts.
 */

const { Driver, Wallet, Payout, sequelize } = require('@models');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Initiates a payout request for a driver.
 * @param {number} driverId - Driver ID.
 * @param {number} amount - Payout amount.
 * @param {string} method - Payout method (bank_transfer, wallet_transfer, mobile_money).
 * @returns {Promise<Object>} Created payout record.
 */
async function requestPayout(driverId, amount, method) {
  if (!driverConstants.WALLET_CONSTANTS.PAYOUT_SETTINGS.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }
  if (amount < driverConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT ||
      amount > driverConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT) {
    throw new AppError('Invalid payout amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
  if (parseFloat(wallet.balance) < amount) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  const transaction = await sequelize.transaction();
  try {
    // Check withdrawal attempts
    const recentPayouts = await Payout.count({
      where: {
        driver_id: driverId,
        created_at: { [sequelize.Op.gte]: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentPayouts >= paymentConstants.SECURITY_CONSTANTS.MAX_WITHDRAWAL_ATTEMPTS_PER_HOUR) {
      throw new AppError('Withdrawal attempts exceeded', 429, paymentConstants.ERROR_CODES.WITHDRAWAL_ATTEMPTS_EXCEEDED);
    }

    // Create payout record
    const payout = await Payout.create({
      driver_id: driverId,
      wallet_id: wallet.id,
      amount,
      currency: wallet.currency,
      method,
      status: paymentConstants.TRANSACTION_STATUSES.PENDING,
    }, { transaction });

    // Deduct from wallet
    const newBalance = parseFloat(wallet.balance) - amount;
    await wallet.update({ balance: newBalance }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'REQUEST_PAYOUT',
      details: { driverId, amount, method, payoutId: payout.id },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
      message: formatMessage(
        'driver',
        'financial',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'payout.requested',
        { amount, currency: wallet.currency, method }
      ),
      priority: 'MEDIUM',
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'payout:requested', { payoutId: payout.id, amount, method });

    await transaction.commit();
    logger.info('Payout requested', { driverId, payoutId: payout.id, amount, method });
    return payout;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Payout request failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Retrieves driver's payout history.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Array<Object>>} Payout records.
 */
async function getPayoutHistory(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const payouts = await Payout.findAll({
    where: { driver_id: driverId },
    order: [['created_at', 'DESC']],
    include: [{ model: Wallet, as: 'wallet', attributes: ['id', 'currency'] }],
  });

  logger.info('Payout history retrieved', { driverId });
  return payouts.map(p => ({
    payoutId: p.id,
    amount: parseFloat(p.amount),
    currency: p.currency,
    method: p.method,
    status: p.status,
    created_at: p.created_at,
  }));
}

/**
 * Verifies the payout method for a driver.
 * @param {number} driverId - Driver ID.
 * @param {string} method - Payout method to verify.
 * @returns {Promise<boolean>} True if verified.
 */
async function verifyPayoutMethod(driverId, method) {
  if (!driverConstants.WALLET_CONSTANTS.PAYOUT_SETTINGS.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  // Simulate verification (e.g., check KYC, payment method details)
  const isVerified = true; // Replace with actual verification logic (e.g., Stripe API, bank validation)

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'VERIFY_PAYOUT_METHOD',
    details: { driverId, method, isVerified },
    ipAddress: 'unknown',
  });

  logger.info('Payout method verified', { driverId, method, isVerified });
  return isVerified;
}

/**
 * Schedules recurring payouts for a driver.
 * @param {number} driverId - Driver ID.
 * @param {Object} schedule - Payout schedule (e.g., { frequency: 'weekly', amount: 100, method: 'bank_transfer' }).
 * @returns {Promise<void>}
 */
async function scheduleRecurringPayout(driverId, schedule) {
  const { frequency, amount, method } = schedule;
  if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
    throw new AppError('Invalid payout frequency', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }
  if (amount < driverConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT ||
      amount > driverConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT) {
    throw new AppError('Invalid payout amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
  if (!driverConstants.WALLET_CONSTANTS.PAYOUT_SETTINGS.SUPPORTED_PAYOUT_METHODS.includes(method)) {
    throw new AppError('Invalid payout method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  // Simulate storing schedule (e.g., in a RecurringPayout model or driver settings)
  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'SCHEDULE_RECURRING_PAYOUT',
    details: { driverId, frequency, amount, method },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
    message: formatMessage(
      'driver',
      'financial',
      driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      'payout.scheduled',
      { frequency, amount, method }
    ),
    priority: 'LOW',
  });

  socketService.emitToUser(driver.user_id, 'payout:scheduled', { driverId, frequency, amount, method });

  logger.info('Recurring payout scheduled', { driverId, frequency, amount, method });
}

module.exports = {
  requestPayout,
  getPayoutHistory,
  verifyPayoutMethod,
  scheduleRecurringPayout,
};