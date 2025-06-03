'use strict';

/**
 * Driver Balance Service
 * Manages driver wallet balance operations, including retrieving balance,
 * updating with earnings/tips, and locking/unlocking funds for disputes.
 */

const { Wallet, Driver, sequelize } = require('@models');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Retrieves driver's wallet balance.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Balance details.
 */
async function getWalletBalance(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  logger.info('Wallet balance retrieved', { driverId, walletId: wallet.id });
  return {
    driverId,
    walletId: wallet.id,
    balance: parseFloat(wallet.balance),
    currency: wallet.currency,
    lockedBalance: wallet.locked_balance || 0, // Assumes locked_balance field or 0
  };
}

/**
 * Updates driver's wallet balance with earnings or tips.
 * @param {number} driverId - Driver ID.
 * @param {number} amount - Amount to add/subtract.
 * @param {string} type - Transaction type (earning, tip).
 * @returns {Promise<void>}
 */
async function updateBalance(driverId, amount, type) {
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
    const newBalance = parseFloat(wallet.balance) + amount;
    if (newBalance < paymentConstants.WALLET_SETTINGS.MIN_BALANCE ||
        newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
      throw new AppError('Balance out of bounds', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
    }

    await wallet.update({ balance: newBalance }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_BALANCE',
      details: { driverId, amount, type, newBalance },
      ipAddress: 'unknown',
    });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[type === 'tip' ? 'TIP_RECEIVED' : 'DEPOSIT_CONFIRMED'],
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `balance.${type}_added`,
        { amount, currency: wallet.currency }
      ),
      priority: 'MEDIUM',
    });

    await transaction.commit();
    logger.info('Balance updated', { driverId, amount, type, newBalance });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Locks funds in driver's wallet for disputes.
 * @param {number} driverId - Driver ID.
 * @param {number} amount - Amount to lock.
 * @returns {Promise<void>}
 */
async function lockBalance(driverId, amount) {
  if (amount <= 0) throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);

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
    const lockedBalance = parseFloat(wallet.locked_balance || 0) + amount;
    await wallet.update({ locked_balance }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'LOCK_BALANCE',
      details: { driverId, amount, lockedBalance },
      ipAddress: 'unknown',
    });

    await transaction.commit();
    logger.info('Balance locked', { driverId, amount, lockedBalance });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Lock balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

/**
 * Unlocks funds in driver's wallet.
 * @param {number} driverId - Driver ID.
 * @param {number} amount - Amount to unlock.
 * @returns {Promise<void>}
 */
async function unlockBalance(driverId, amount) {
  if (amount <= 0) throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const currentLocked = parseFloat(wallet.locked_balance || 0);
  if (currentLocked < amount) {
    throw new AppError('Insufficient locked funds', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
  }

  const transaction = await sequelize.transaction();
  try {
    const lockedBalance = currentLocked - amount;
    await wallet.update({ locked_balance: lockedBalance }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UNLOCK_BALANCE',
      details: { driverId, amount, lockedBalance },
      ipAddress: 'unknown',
    });

    await transaction.commit();
    logger.info('Balance unlocked', { driverId, amount, lockedBalance });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Unlock balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }
}

module.exports = {
  getWalletBalance,
  updateBalance,
  lockBalance,
  unlockBalance,
};