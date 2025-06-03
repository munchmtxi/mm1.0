'use strict';

const { sequelize } = require('@models');
const { enableScreenReaders, adjustFonts, supportMultiLanguage } = require('@services/customer/profile/accessibility/accessibilityService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const accessibilityEvents = require('@socket/events/customer/profile/accessibility/accessibilityEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const updateScreenReader = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { enabled } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await enableScreenReaders(userId, enabled, transaction);
    if (enabled) {
      await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'accessibility_updated').action, {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
    }
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.screen_reader_updated',
      messageParams: { enabled: enabled ? 'enabled' : 'disabled' },
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, accessibilityEvents.SCREEN_READER_UPDATED, {
      userId,
      screenReaderEnabled: result.screenReaderEnabled,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'UPDATE_SCREEN_READER',
      userId,
      role: 'customer',
      details: `Screen reader ${enabled ? 'enabled' : 'disabled'} for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Screen reader settings updated', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateFontSize = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { fontSize } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await adjustFonts(userId, fontSize, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'accessibility_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.font_size_updated',
      messageParams: { fontSize },
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, accessibilityEvents.FONT_SIZE_UPDATED, {
      userId,
      fontSize: result.fontSize,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'UPDATE_FONT_SIZE',
      userId,
      role: 'customer',
      details: `Font size updated to ${fontSize} for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Font size updated', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateLanguage = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { language } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await supportMultiLanguage(userId, language, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'accessibility_updated').action, {
      io,
      role: 'customer',
      languageCode: language,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.language_updated',
      messageParams: { languageCode: language },
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, accessibilityEvents.LANGUAGE_UPDATED, {
      userId,
      language: result.language,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'UPDATE_LANGUAGE',
      userId,
      role: 'customer',
      details: `Language updated to ${language} for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Language updated', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { updateScreenReader, updateFontSize, updateLanguage };