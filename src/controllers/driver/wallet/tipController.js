'use strict';

const tipService = require('@services/driver/wallet/tipService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const tipConstants = require('@constants/common/tipConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function recordTip(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { taskId, amount } = req.body;
    const tip = await tipService.recordTip(driverId, taskId, amount, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: tip,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'tip.received',
        { amount, taskId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getTipHistory(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const tips = await tipService.getTipHistory(driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: tips,
    });
  } catch (error) {
    next(error);
  }
}

async function notifyTipReceived(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const { taskId } = req.body;
    const result = await tipService.notifyTipReceived(
      driverId,
      taskId,
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
        'tip.notified'
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function awardTipPoints(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const pointsRecord = await tipService.awardTipPoints(driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'SUCCESS',
      data: pointsRecord,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'tip.points_awarded',
        { points: pointsRecord.points }
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  recordTip,
  getTipHistory,
  notifyTipReceived,
  awardTipPoints,
};