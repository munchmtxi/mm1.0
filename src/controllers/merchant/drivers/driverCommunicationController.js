'use strict';

const { sequelize } = require('@models');
const driverCommunicationService = require('@services/merchant/drivers/driverCommunicationService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'driverMessageSent' && metadata.messageLength) {
    multipliers *= actionConfig.multipliers.messageLength * metadata.messageLength || 1;
  }
  if (action === 'deliveryUpdateBroadcast' && metadata.orderStatus) {
    multipliers *= actionConfig.multipliers.orderStatus * (metadata.orderStatus === 'pending' ? 2 : 1) || 1;
  }
  if (action === 'driverChannelsUpdated' && metadata.driverCount) {
    multipliers *= actionConfig.multipliers.driverCount * metadata.driverCount || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const sendDriverMessage = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const { message } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await driverCommunicationService.sendDriverMessage(driverId, message, ipAddress, transaction);
    const points = calculatePoints(result.action, { messageLength: message.length }, 'driver');

    await notificationService.sendNotification(
      {
        userId: driverId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'driverCommunication.driverMessageSent',
        messageParams: { message },
        priority: 'MEDIUM',
        role: 'driver',
        module: 'drivers',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(driverId, result.action, points, {
        io,
        role: 'driver',
        languageCode: result.language,
        metadata: { messageLength: message.length },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'driverCommunication.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'driver',
          module: 'drivers',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: driverId,
        role: 'driver',
        action: 'driver_message_sent',
        details: { driverId, message, logId: result.logId, taskId: result.taskId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:drivers:driverMessageSent', { driverId, notificationId: result.notificationId, message, taskId: result.taskId, points }, `driver:${driverId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const broadcastDeliveryUpdates = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const { message } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await driverCommunicationService.broadcastDeliveryUpdates(orderId, message, ipAddress, transaction);
    const points = calculatePoints(result.action, { orderStatus: 'pending' }, 'driver');

    await notificationService.sendNotification(
      {
        userId: result.driverId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'driverCommunication.deliveryUpdateBroadcast',
        messageParams: { orderNumber: result.orderNumber, message },
        priority: 'HIGH',
        role: 'driver',
        module: 'drivers',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(result.driverId, result.action, points, {
        io,
        role: 'driver',
        languageCode: result.language,
        metadata: { orderStatus: 'pending' },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: result.driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'driverCommunication.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'driver',
          module: 'drivers',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: result.driverId,
        role: 'driver',
        action: 'delivery_update_broadcast',
        details: { orderId, message, logId: result.logId, orderNumber: result.orderNumber, taskId: result.taskId, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:drivers:deliveryUpdateBroadcast', { driverId: result.driverId, orderId, orderNumber: result.orderNumber, message, taskId: result.taskId, points }, `driver:${result.driverId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageDriverChannels = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await driverCommunicationService.manageDriverChannels(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { driverCount: result.driverCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'driverCommunication.driverChannelsUpdated',
        messageParams: { driverCount: result.driverCount },
        priority: 'LOW',
        role: 'merchant',
        module: 'drivers',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { driverCount: result.driverCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'driverCommunication.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'drivers',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'driver_channels_updated',
        details: { merchantId, driverCount: result.driverCount, taskCount: result.taskCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:drivers:driverChannelsUpdated', { merchantId, driverIds: result.driverIds, taskIds: result.taskIds, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { sendDriverMessage, broadcastDeliveryUpdates, manageDriverChannels };