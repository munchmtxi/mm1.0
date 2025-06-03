'use strict';

/**
 * Driver Tip Service
 * Manages driver tip operations, including recording tips, retrieving history,
 * sending notifications, and awarding gamification points.
 */

const { Tip, Driver, Wallet, sequelize } = require('@models');
const balanceService = require('./balanceService');
const transactionService = require('./transactionService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const driverConstants = require('@constants/driverConstants');
const tipConstants = require('@constants/common/tipConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

/**
 * Records a tip received by a driver.
 * @param {number} driverId - Driver ID.
 * @param {number} taskId - Order, Ride, Booking, Event Service, or In-Dining Order ID.
 * @param {number} amount - Tip amount.
 * @returns {Promise<void>}
 */
async function recordTip(driverId, taskId, amount) {
  if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
    throw new AppError('Invalid tip amount', 400, tipConstants.ERROR_CODES.INVALID_AMOUNT);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);

  // Validate taskId against supported service types
  const serviceTypes = tipConstants.TIP_SETTINGS.SERVICE_TYPES;
  let tipData = { recipient_id: driver.user_id, wallet_id: wallet.id, amount, currency: driverConstants.DRIVER_SETTINGS.DEFAULT_CURRENCY };
  let serviceType;

  if (!(await validateTaskId(taskId, driverId, tipData, serviceTypes))) {
    throw new AppError('Invalid task ID for service', 400, tipConstants.ERROR_CODES.TIP_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    // Check for existing tip
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
    if (existingTip) throw new AppError('Tip already exists', 400, tipConstants.ERROR_CODES.TIP_ALREADY_EXISTS);

    // Create Tip record
    const tip = await Tip.create(tipData, { transaction });

    // Update wallet balance
    await balanceService.updateBalance(driverId, amount, driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.TIP, { transaction });

    // Record wallet transaction
    await transactionService.recordTransaction(
      driverId,
      taskId,
      amount,
      driverConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.TIP,
      { transaction }
    );

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'RECORD_TIP',
      details: { driverId, taskId, amount, tipId: tip.id },
      ipAddress: 'unknown',
    }, { transaction });

    await transaction.commit();
    logger.info('Tip recorded', { driverId, taskId, amount, tipId: tip.id });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Record tip failed: ${error.message}`, 500, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

/**
 * Retrieves driver's tip history.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Array<Object>>} Tip records.
 */
async function getTipHistory(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

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
  });

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
}

/**
 * Notifies driver of a received tip.
 * @param {number} driverId - Driver ID.
 * @param {number} taskId - Order, Ride, Booking, Event Service, or In-Dining Order ID.
 * @returns {Promise<void>}
 */
async function notifyTipReceived(driverId, taskId) {
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
  if (!tip) throw new AppError('Tip not found', 404, tipConstants.ERROR_CODES.TIP_NOT_FOUND);

  try {
    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: tipConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TIP_RECEIVED,
      message: formatMessage(
        'driver',
        'wallet',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'tip.received',
        { amount: tip.amount, taskId }
      ),
      priority: tipConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
      deliveryMethod: tipConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
    });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'NOTIFY_TIP_RECEIVED',
      details: { driverId, taskId, amount: tip.amount, tipId: tip.id },
      ipAddress: 'unknown',
    });

    logger.info('Tip notification sent', { driverId, taskId, tipId: tip.id });
  } catch (error) {
    throw new AppError(`Notify tip failed: ${error.message}`, 500, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

/**
 * Awards gamification points for receiving a tip.
 * @param {number} driverId - Driver ID.
 * @returns {Promise<Object>} Points awarded record.
 */
async function awardTipPoints(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const recentTip = await Tip.findOne({
    where: { recipient_id: driver.user_id, status: 'completed' },
    order: [['created_at', 'DESC']],
  });
  if (!recentTip) throw new AppError('No recent tip found', 404, tipConstants.ERROR_CODES.TIP_NOT_FOUND);

  try {
    const pointsRecord = await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.TIP_MAGNET.action,
      languageCode: driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: 'AWARD_TIP_POINTS',
      details: { driverId, points: pointsRecord.points, tipId: recentTip.id },
      ipAddress: 'unknown',
    });

    logger.info('Tip points awarded', { driverId, points: pointsRecord.points, tipId: recentTip.id });
    return pointsRecord;
  } catch (error) {
    throw new AppError(`Award tip points failed: ${error.message}`, 500, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }
}

/**
 * Validates taskId against supported service types.
 * @param {number} taskId - Task ID.
 * @param {number} driverId - Driver ID.
 * @param {Object} tipData - Tip data object.
 * @param {Array<string>} serviceTypes - Supported service types.
 * @returns {Promise<boolean>} True if valid.
 */
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
    const booking = await sequelize.models.Booking.findOne({ where: { id: taskId } }); // Adjust as needed
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