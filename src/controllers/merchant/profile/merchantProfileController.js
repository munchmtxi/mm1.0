'use strict';

const {
  updateBusinessDetails,
  setCountrySettings,
  manageLocalization,
} = require('@services/merchant/profile/merchantProfileService');
const { Merchant } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const updateBusinessDetailsController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const details = req.body;
  const merchant = await updateBusinessDetails(merchantId, details);

  await auditService.logAction({
    userId: merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MERCHANT_PROFILE_CONSTANTS.AUDIT_TYPES.UPDATE_BUSINESS_DETAILS,
    details,
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    notificationType: merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.BUSINESS_UPDATED,
    messageKey: 'profile.merchant.business_updated',
    messageParams: { merchantId },
    role: 'merchant',
    module: 'profile',
    languageCode: merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'profile:business_updated', {
    userId: merchant.user_id,
    merchantId,
    updatedFields: details,
  }, `merchant:${merchant.user_id}`);

  // Award points for profile completion
  const profileComplete = details.businessName && details.phone && details.businessHours && details.businessType;
  if (profileComplete) {
    const pointsRecord = await pointService.awardPoints({
      userId: merchant.user_id,
      role: 'merchant',
      action: merchantConstants.GAMIFICATION_CONSTANTS.MERCHANT_ACTIONS.find(a => a.action === 'profile_completion').action,
      languageCode: merchant.preferred_language || 'en',
    });

    await notificationService.sendNotification({
      userId: merchant.user_id,
      merchant_id: merchant.id,
      notificationType: merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.PROFILE_POINTS_AWARDED,
      messageKey: 'profile.merchant.points_awarded',
      messageParams: { points: pointsRecord.points },
      role: 'merchant',
      module: 'profile',
      languageCode: merchant.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: merchantConstants.MERCHANT_PROFILE_CONSTANTS.AUDIT_TYPES.AWARD_PROFILE_POINTS,
      details: { points: pointsRecord.points, action: 'profile_completion' },
      ipAddress: req.ip || '0.0.0.0',
      metadata: { merchantId },
    });
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'merchant.business_updated', { merchantId }),
    data: merchant,
  });
});

const setCountrySettingsController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { country } = req.body;
  const merchant = await setCountrySettings(merchantId, country);

  await auditService.logAction({
    userId: merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MERCHANT_PROFILE_CONSTANTS.AUDIT_TYPES.SET_COUNTRY_SETTINGS,
    details: { country },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    notificationType: merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.COUNTRY_UPDATED,
    messageKey: 'profile.merchant.country_updated',
    messageParams: { country, merchantId },
    role: 'merchant',
    module: 'profile',
    languageCode: merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'profile:country_updated', {
    userId: merchant.user_id,
    merchantId,
    country,
  }, `merchant:${merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'merchant.country_updated', { country, merchantId }),
    data: merchant,
  });
});

const manageLocalizationController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const settings = req.body;
  const merchant = await manageLocalization(merchantId, settings);

  await auditService.logAction({
    userId: merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MERCHANT_PROFILE_CONSTANTS.AUDIT_TYPES.MANAGE_LOCALIZATION,
    details: settings,
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    notificationType: merchantConstants.MERCHANT_PROFILE_CONSTANTS.NOTIFICATION_TYPES.LOCALIZATION_UPDATED,
    messageKey: 'profile.merchant.localization_updated',
    messageParams: { language: settings.language, merchantId },
    role: 'merchant',
    module: 'profile',
    languageCode: merchant.preferred_language || settings.language || 'en',
  });

  await socketService.emit(null, 'profile:localization_updated', {
    userId: merchant.user_id,
    merchantId,
    language: settings.language,
  }, `merchant:${merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'merchant.localization_updated', { language: settings.language, merchantId }),
    data: merchant,
  });
});

module.exports = {
  updateBusinessDetailsController,
  setCountrySettingsController,
  manageLocalizationController,
};