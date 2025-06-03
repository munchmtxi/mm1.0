'use strict';

const { sequelize } = require('@models');
const { setPrivacySettings, manageDataAccess } = require('@services/customer/profile/privacy/privacyService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const privacyEvents = require('@socket/events/customer/profile/privacy/privacyEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const updatePrivacySettings = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const settings = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await setPrivacySettings(userId, settings, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'privacy_settings_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.privacy_settings_updated',
      messageParams: {},
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, privacyEvents.PRIVACY_SETTINGS_UPDATED, {
      userId,
      settings: result.settings,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'UPDATE_PRIVACY_SETTINGS',
      userId,
      role: 'customer',
      details: `Privacy settings updated for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Privacy settings updated', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateDataAccess = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const permissions = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await manageDataAccess(userId, permissions, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'privacy_settings_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.data_access_updated',
      messageParams: {},
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, privacyEvents.DATA_ACCESS_UPDATED, {
      userId,
      permissions: result.permissions,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'UPDATE_DATA_ACCESS',
      userId,
      role: 'customer',
      details: `Data access permissions updated for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Data access permissions updated', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { updatePrivacySettings, updateDataAccess };