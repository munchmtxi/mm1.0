'use strict';

const { Tip, Driver, Wallet, sequelize } = require('@models');
const balanceService = require('./walletService');
const transactionService = require('./transactionService');
const driverConstants = require('@constants/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const tipConstants = require('@constants/common/tipConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function recordTip(driverId, taskId, amount, auditService, notificationService, socketService, pointService) {
  if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
    throw new AppError('Invalid tip amount', 400, tipConstants.ERROR_CODES[9]); // 'INVALID_AMOUNT'
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES[2] }, // 'driver'
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES[0]); // 'WALLET_NOT_FOUND'

  let tipData = {
    recipient_id: driver.user_id,
    wallet_id: wallet.id,
    amount,
    currency: tipConstants.TIP_SETTINGS.SUPPORTED_CURRENCIES.includes(wallet.currency)
      ? wallet.currency
      : driverConstants.DRIVER_SETTINGS.DEFAULT_CURRENCY,
  };
  const serviceTypes = tipConstants.TIP_SETTINGS.SERVICE_TYPES;

  if (!(await validateTaskId(taskId, driverId, tipData, serviceTypes))) {
    throw new AppError('Invalid task ID for service', 400, tipConstants.ERROR_CODES[11]); // 'TIP_NOT_FOUND'
  }

  const transaction = await sequelize.transaction();
  try {
    const existingTip = await Tip.findOne({
      where: {
        [Op.or]: [
          { ride_id: taskId },
          { order_id: taskId },
          { booking_id: taskId },
          { event_service_id: taskId },
          { in_dining_order_id: taskId },
        ],
        recipient_id: driver.user_id,
      },
      transaction,
    });
    if (existingTip) throw new AppError('Tip already exists', 400, tipConstants.ERROR_CODES[10]); // 'TIP_ALREADY_EXISTS'

    const tip = await Tip.create(tipData, { transaction });

    await balanceService.updateBalance(
      driverId,
      amount,
      driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[7], // 'tip'
      auditService,
      notificationService,
      socketService,
      pointService,
      { transaction }
    );

    await transactionService.recordTransaction(
      driverId,
      taskId,
      amount,
      driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[7], // 'tip'
      { transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'RECORD_TIP',
      details: { driverId, taskId, amount, tipId: tip.id },
      ipAddress: 'unknown',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tip_received').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'tip:received', {
      driverId,
      taskId,
      amount,
      tipId: tip.id,
    });

    await transaction.commit();
    logger.info('Tip recorded', { driverId, taskId, amount, tipId: tip.id });
    return {
      tipId: tip.id,
      taskId,
      amount,
      currency: tipData.currency,
      status: tip.status,
      created_at: tip.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Record tip failed: ${error.message}`, 500, tipConstants.ERROR_CODES[12]); // 'TIP_ACTION_FAILED'
  }
}

async function getTipHistory(driverId, auditService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const tips = await Tip.findAll({
      where: { recipient_id: driver.user_id },
      order: [['created_at', 'DESC']],
      include: [
        { model: sequelize.models.Ride, as: 'ride', attributes: ['id', 'status'] },
        { model: sequelize.models.Order, as: 'order', attributes: ['id', 'status'] },
        { model: sequelize.models.Booking, as: 'booking', attributes: ['id'] },
        { model: sequelize.models.EventService, as: 'event_service', attributes: ['id'] },
        { model: sequelize.models.InDiningOrder, as: 'in_dining_order', attributes: ['id', 'status'] },
      ],
      transaction,
    });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'GET_TIP_HISTORY',
      details: { driverId, tipCount: tips.length },
      ipAddress: 'unknown',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tip_history_view').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'tip:history_viewed', {
      driverId,
      tipCount: tips.length,
    });

    await transaction.commit();
    logger.info('Tip history retrieved', { driverId });
    return tips.map(t => ({
      tipId: t.id,
      taskId: t.ride_id || t.order_id || t.booking_id || t.event_service_id || t.in_dining_order_id,
      serviceType: t.ride_id ? 'ride' : t.order_id ? 'order' : t.booking_id ? 'booking' : t.event_service_id ? 'event_service' : 'in_dining_order',
      amount: parseFloat(t.amount),
      currency: t.currency,
      status: t.status,
      created_at: t.created_at,
    }));
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get tip history failed: ${error.message}`, 500, tipConstants.ERROR_CODES[12]); // 'TIP_ACTION_FAILED'
  }
}

async function notifyTipReceived(driverId, taskId, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const tip = await Tip.findOne({
    where: {
      recipient_id: driver.user_id,
      [Op.or]: [
        { ride_id: taskId },
        { order_id: taskId },
        { booking_id: taskId },
        { event_service_id: taskId },
        { in_dining_order_id: taskId },
      ],
    },
  });
  if (!tip) throw new AppError('Tip not found', 404, tipConstants.ERROR_CODES[11]); // 'TIP_NOT_FOUND'

  const transaction = await sequelize.transaction();
  try {
    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_RECEIVED,
      message: formatMessage(
        'driver',
        'wallet',
        driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'tip.received',
        { amount: tip.amount, taskId }
      ),
      priority: tipConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
      deliveryMethod: tipConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
    }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'NOTIFY_TIP_RECEIVED',
      details: { driverId, taskId, amount: tip.amount, tipId: tip.id },
      ipAddress: 'unknown',
    }, { transaction });

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tip_notification_received').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'tip:notified', {
      driverId,
      taskId,
      amount: tip.amount,
      tipId: tip.id,
    });

    await transaction.commit();
    logger.info('Tip notification sent', { driverId, taskId, tipId: tip.id });
    return { tipId: tip.id, taskId, amount: tip.amount };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Notify tip failed: ${error.message}`, 500, tipConstants.ERROR_CODES[12]); // 'TIP_ACTION_FAILED'
  }
}

async function awardTipPoints(driverId, auditService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const recentTip = await Tip.findOne({
    where: { recipient_id: driver.user_id, status: tipConstants.TIP_SETTINGS.TIP_STATUSES[1] }, // 'completed'
    order: [['created_at', 'DESC']],
  });
  if (!recentTip) throw new AppError('No recent tip found', 404, tipConstants.ERROR_CODES[11]); // 'TIP_NOT_FOUND'

  const transaction = await sequelize.transaction();
  try {
    const pointsRecord = await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tip_magnet').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'AWARD_TIP_POINTS',
      details: { driverId, points: pointsRecord.points, tipId: recentTip.id },
      ipAddress: 'unknown',
    }, { transaction });

    socketService.emitToUser(driver.user_id, 'tip:points_awarded', {
      driverId,
      points: pointsRecord.points,
      tipId: recentTip.id,
    });

    await transaction.commit();
    logger.info('Tip points awarded', { driverId, points: pointsRecord.points, tipId: recentTip.id });
    return {
      tipId: recentTip.id,
      points: pointsRecord.points,
      walletCredit: pointsRecord.walletCredit,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Award tip points failed: ${error.message}`, 500, tipConstants.ERROR_CODES[12]); // 'TIP_ACTION_FAILED'
  }
}

async function validateTaskId(taskId, driverId, tipData, serviceTypes) {
  if (serviceTypes.includes('ride')) {
    const ride = await sequelize.models.Ride.findOne({ where: { id: taskId, driver_id: driverId } });
    if (ride) {
      tipData.ride_id = taskId;
      return true;
    }
  }
  if (serviceTypes.includes('order')) {
    const order = await sequelize.models.Order.findOne({ where: { id: taskId, driver_id: driverId } });
    if (order) {
      tipData.order_id = taskId;
      return true;
    }
  }
  if (serviceTypes.includes('booking')) {
    const booking = await sequelize.models.Booking.findOne({ where: { id: taskId } });
    if (booking) {
      tipData.booking_id = taskId;
      return true;
    }
  }
  if (serviceTypes.includes('event_service')) {
    const eventService = await sequelize.models.EventService.findOne({ where: { id: taskId } });
    if (eventService) {
      tipData.event_service_id = taskId;
      return true;
    }
  }
  if (serviceTypes.includes('in_dining_order')) {
    const inDiningOrder = await sequelize.models.InDiningOrder.findOne({ where: { id: taskId } });
    if (inDiningOrder) {
      tipData.in_dining_order_id = taskId;
      return true;
    }
  }
  return false;
}

module.exports = {
  recordTip,
  getTipHistory,
  notifyTipReceived,
  awardTipPoints,
};