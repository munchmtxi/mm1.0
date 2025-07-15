'use strict';

const { sequelize } = require('@models');
const notificationService = require('@services/merchant/crm/notificationService');
const notificationCommonService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (metadata.messageType) {
    multipliers *= actionConfig.multipliers.messageType * (metadata.messageType.includes('update') ? 2 : 1) || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const sendCustomerAlert = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const { message } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await notificationService.sendCustomerAlert(customerId, message, ipAddress, transaction);
    const points = calculatePoints(result.action, { messageType: result.messageType }, 'customer');

    await notificationCommonService.sendNotification(
      {
        userId: customerId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.ALERT,
        messageKey: 'crm.customerAlertSent',
        messageParams: { messageType: result.messageType },
        priority: 'MEDIUM',
        role: 'customer',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(customerId, result.action, points, {
        io,
        role: 'customer',
        languageCode: result.language,
        metadata: { messageType: result.messageType },
      }, transaction);

      await notificationCommonService.sendNotification(
        {
          userId: customerId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'customer',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: customerId,
        role: 'customer',
        action: 'send_customer_alert',
        details: { customerId, messageType: result.messageType, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:customerAlertSent', { customerId, notificationId: result.notificationId, points }, `customer:${customerId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const sendStaffNotification = catchAsync(async (req, res) => {
  const { staffId } = req.params;
  const { message } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await notificationService.sendStaffNotification(staffId, message, ipAddress, transaction);
    const points = calculatePoints(result.action, { messageType: result.messageType }, 'staff');

    await notificationCommonService.sendNotification(
      {
        userId: staffId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.ALERT,
        messageKey: 'crm.staffNotificationSent',
        messageParams: { messageType: result.messageType },
        priority: 'MEDIUM',
        role: 'staff',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(staffId, result.action, points, {
        io,
        role: 'staff',
        languageCode: result.language,
        metadata: { messageType: result.messageType },
      }, transaction);

      await notificationCommonService.sendNotification(
        {
          userId: staffId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'staff',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: staffId,
        role: 'staff',
        action: 'send_staff_notification',
        details: { staffId, messageType: result.messageType, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:crm:staffNotificationSent', { staffId, notificationId: result.notificationId, points }, `staff:${staffId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const sendDriverNotification = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const { message } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await notificationService.sendDriverNotification(driverId, message, ipAddress, {});
    const points = calculatePoints(result.action, { messageType: result.messageType }, 'driver');

    await notificationCommonService.sendNotification(
      {
        userId: driverId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.ALERT,
        messageKey: 'crm.driverNotificationSent',
        messageParams: { messageType: result.messageType },
        priority: 'HIGH',
        role: 'driver',
        module: 'crm',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(driverId, result.action, points, {
        io,
        role: 'driver',
        languageCode: result.language,
        metadata: { messageType: result.messageType },
      }, transaction);

      await notificationCommonService.sendNotification(
        {
          userId: driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'crm.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'driver',
          module: 'crm',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: driverId,
        role: 'driver',
        action: 'send_driver_notification',
        details: { driverId, messageType: result.messageType, points },
        ipAddress,
      },
      await transaction.commit();
    );

    await socketService.sendNotification(
      io,
      'merchant:crm:driverNotificationSent',
      { driverId, notificationId: result.notificationId, points },
      `notification:${driverId}`,
    );

    await transaction.commit();
    res.status(200).json({ success: true, notification: { ...result, points } });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error in sendDriverNotification controller', { err });
    throw err;
  }
});

module.exports = { sendCustomerAlert, sendStaffNotification, sendDriverNotification };