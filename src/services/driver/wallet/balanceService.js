'use strict';

const { Wallet, Driver, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function getWalletBalance(driverId, auditService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'GET_WALLET_BALANCE',
      details: { driverId, walletId: wallet.id },
      ipAddress: 'unknown',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'wallet_balance_check').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'wallet:balance_updated', {
      driverId,
      walletId: wallet.id,
      balance: parseFloat(wallet.balance),
    });

    await transaction.commit();
    logger.info('Wallet balance retrieved', { driverId, walletId: wallet.id });
    return {
      driverId,
      walletId: wallet.id,
      balance: parseFloat(wallet.balance),
      currency: wallet.currency,
      lockedBalance: parseFloat(wallet.locked_balance || 0),
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get wallet balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

async function updateBalance(driverId, amount, type, auditService, notificationService, socketService, pointService) {
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
    const newBalance = parseFloat(wallet.balance) + amount;
    if (newBalance < paymentConstants.WALLET_SETTINGS.MIN_BALANCE ||
        newBalance > paymentConstants.WALLET_SETTINGS.MAX_BALANCE) {
      throw new AppError('Balance out of bounds', 400, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
    }

    await wallet.update({ balance: newBalance }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'UPDATE_BALANCE',
      details: { driverId, amount, type, newBalance },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[type === 'tip' ? 'TIP_RECEIVED' : 'DEPOSIT_CONFIRMED'],
      message: formatMessage(
        'driver',
        'wallet',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `balance.${type}_added`,
        { amount, currency: wallet.currency }
      ),
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === `wallet_${type}_received`).action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'wallet:balance_updated', {
      driverId,
      amount,
      type,
      newBalance,
    });

    await transaction.commit();
    logger.info('Balance updated', { driverId, amount, type, newBalance });
    return {
      driverId,
      walletId: wallet.id,
      balance: newBalance,
      currency: wallet.currency,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Update balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

async function lockBalance(driverId, amount, auditService, socketService, pointService) {
  if (amount <= 0) throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  if (parseFloat(wallet.balance) < amount) {
    throw new AppError('Insufficient funds', 400, paymentConstants.ERROR_CODES[1]); // 'INSUFFICIENT_FUNDS'
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
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'wallet_balance_lock').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'wallet:balance_locked', {
      driverId,
      amount,
      lockedBalance,
    });

    await transaction.commit();
    logger.info('Balance locked', { driverId, amount, lockedBalance });
    return { driverId, amount, lockedBalance };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Lock balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

async function unlockBalance(driverId, amount, auditService, socketService, pointService) {
  if (amount <= 0) throw new AppError('Invalid amount', 400, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  const currentLocked = parseFloat(wallet.locked_balance || 0);
  if (currentLocked < amount) {
    throw new AppError('Insufficient locked funds', 400, paymentConstants.ERROR_CODES[1]); // 'INSUFFICIENT_FUNDS'
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
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'wallet_balance_unlock').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'wallet:balance_unlocked', {
      driverId,
      amount,
      lockedBalance,
    });

    await transaction.commit();
    logger.info('Balance unlocked', { driverId, amount, lockedBalance });
    return { driverId, amount, lockedBalance };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Unlock balance failed: ${error.message}`, 500, paymentConstants.ERROR_CODES[3]); // 'TRANSACTION_FAILED'
  }
}

module.exports = {
  getWalletBalance,
  updateBalance,
  lockBalance,
  unlockBalance,
};