'use strict';

const { sequelize } = require('@models');
const { updateProfile, setCountry, setLanguage, setDietaryPreferences, getProfile } = require('@services/customer/profile/profileService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const updateCustomerProfile = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const profileData = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await updateProfile(userId, profileData, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'profile_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.updated',
      messageParams: { customerId: result.customerId },
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'profile:updated', {
      userId,
      customerId: result.customerId,
      updatedFields: result.updatedFields,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'UPDATE_CUSTOMER_PROFILE',
      userId,
      role: 'customer',
      details: `Profile updated for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Customer profile updated', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const setCustomerCountry = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { countryCode } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await setCountry(userId, countryCode, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'profile_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.country_updated',
      messageParams: { countryCode },
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'profile:country_updated', {
      userId,
      customerId: result.customerId,
      countryCode,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'SET_CUSTOMER_COUNTRY',
      userId,
      role: 'customer',
      details: `Country set to ${countryCode} for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Customer country set', { userId, countryCode });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const setCustomerLanguage = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { languageCode } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await setLanguage(userId, languageCode, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'profile_updated').action, {
      io,
      role: 'customer',
      languageCode: languageCode || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.language_updated',
      messageParams: { languageCode },
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'profile:language_updated', {
      userId,
      customerId: result.customerId,
      languageCode,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'SET_CUSTOMER_LANGUAGE',
      userId,
      role: 'customer',
      details: `Language set to ${languageCode} for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Customer language set', { userId, languageCode });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const setCustomerDietaryPreferences = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { preferences } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await setDietaryPreferences(userId, preferences, transaction);
    await pointService.awardPoints(userId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'profile_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.profile_updated,
      messageKey: 'profile.dietary_updated',
      messageParams: {},
      role: 'customer',
      module: 'profile',
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'profile:dietary_updated', {
      userId,
      customerId: result.customerId,
      preferences,
    }, `customer:${userId}`);
    await auditService.logAction({
      action: 'SET_CUSTOMER_DIETARY_PREFERENCES',
      userId,
      role: 'customer',
      details: `Dietary preferences updated for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Customer dietary preferences set', { userId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const getCustomerProfile = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const transaction = await sequelize.transaction();
  try {
    const profile = await getProfile(userId, transaction);
    await auditService.logAction({
      action: 'GET_CUSTOMER_PROFILE',
      userId,
      role: 'customer',
      details: `Profile retrieved for user_id: ${userId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Customer profile retrieved', { userId });
    res.status(200).json({ status: 'success', data: profile });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = {
  updateCustomerProfile,
  setCustomerCountry,
  setCustomerLanguage,
  setCustomerDietaryPreferences,
  getCustomerProfile,
};