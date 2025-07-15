'use strict';

const walletService = require('@services/driver/wallet/walletService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function getWalletBalance(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const balance = await walletService.getWalletBalance(driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: balance,
    });
  } catch (error) {
    next(error);
  }
}

async function updateBalance(req, res, next) {
  try {
    const driverId = parseInt(req.body.id || req.user.driverId, 10);
    const { amount, type } = req.body;
    const updatedBalance = await walletService.updateBalance(
      driverId,
      amount,
      type,
      auditService,
      notificationService,
      socketService,
      pointService
    );

    res.status(200).json({
      status: 'success',
      data: updatedBalance,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        `balance.${type}_added`,
        { amount, currency: updatedBalance.currency }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function lockBalance(req, res, next) {
  try {
    const driverId = parseInt(req.body.id || req.user.driverId, 10);
    const { amount } = req.body;
    const result = await walletService.lockBalance(driverId, amount, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'balance.locked'
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function unlockBalance(req, res, next) {
  try {
    const driverId = parseInt(req.body.id || req.user.driverId, 10);
    const { amount } = req.body;
    const result = await walletService.unlockBalance(driverId, amount, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'balance.unlocked'
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWalletBalance,
  updateBalance,
  lockBalance,
  unlockBalance,
};