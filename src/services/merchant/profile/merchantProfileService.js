'use strict';

/**
 * Merchant Profile Service
 * Manages core merchant profile operations, including business details, country settings, localization,
 * and gamification for the Merchant Role System. Integrates with merchantConstants.js for configuration
 * and ensures compliance with security and localization requirements.
 *
 * Last Updated: May 15, 2025
 */

const { Merchant, User } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationPointService');
const auditService = require('@services/common/auditService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const catchAsync = require('@utils/catchAsync');

/**
 * Updates business details for the merchant.
 * @param {string} merchantId - Merchant ID.
 * @param {Object} details - Business details (e.g., name, phone, business hours).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Updated merchant profile.
 */
const updateBusinessDetails = catchAsync(async (merchantId, details, ipAddress) => {
  const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }] });
  if (!merchant) {
    throw new AppError(
      'Merchant not found',
      404,
      merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
    );
  }

  const { businessName, phone, businessHours, businessType, businessTypeDetails } = details;

  // Validate inputs
  if (phone && !validation.validatePhone(phone)) {
    throw new AppError(
      'Invalid phone number format',
      400,
      merchantConstants.ERROR_CODES.INVALID_PHONE
    );
  }
  if (businessHours && (!businessHours.open || !businessHours.close)) {
    throw new AppError(
      'Business hours must include open and close times',
      400,
      merchantConstants.ERROR_CODES.INVALID_OPERATING_HOURS
    );
  }
  if (businessType && !merchantConstants.BUSINESS_TYPE_CODES.includes(businessType)) {
    throw new AppError(
      'Invalid business type',
      400,
      merchantConstants.ERROR_CODES.INVALID_BUSINESS_TYPE
    );
  }
  if (businessTypeDetails && !merchant.validateBusinessTypeDetails()) {
    throw new AppError(
      'Invalid business type details',
      400,
      merchantConstants.ERROR_CODES.INVALID_BUSINESS_TYPE_DETAILS
    );
  }

  // Prepare updated fields
  const updatedFields = {
    business_name: businessName || merchant.business_name,
    phone_number: phone || merchant.phone_number,
    business_hours: businessHours || merchant.business_hours,
    business_type: businessType || merchant.business_type,
    business_type_details: businessTypeDetails || merchant.business_type_details,
    updated_at: new Date(),
  };

  // Update merchant profile
  await merchant.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.UPDATE_MERCHANT_BUSINESS_DETAILS,
    userId: merchant.user_id,
    role: 'merchant',
    details: updatedFields,
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { merchantId },
  });

  // Notify user
  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage(
      'merchant',
      'profile',
      merchant.preferred_language,
      'profile.business_updated',
      { merchantId }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    languageCode: merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${merchant.user_id}`, 'profile:business_updated', {
    userId: merchant.user_id,
    merchantId,
    updatedFields,
  });

  logger.info('Merchant business details updated successfully', { merchantId });
  return merchant;
});

/**
 * Configures merchant country settings for currency and time formats.
 * @param {string} merchantId - Merchant ID.
 * @param {string} country - Country code (e.g., US, GB).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Updated merchant profile.
 */
const setCountrySettings = catchAsync(async (merchantId, country, ipAddress) => {
  const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }] });
  if (!merchant) {
    throw new AppError(
      'Merchant not found',
      404,
      merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
    );
  }

  // Validate country code
  if (!merchantConstants.MERCHANT_SETTINGS.SUPPORTED_COUNTRIES.includes(country)) {
    throw new AppError(
      'Unsupported country',
      400,
      merchantConstants.ERROR_CODES.UNSUPPORTED_COUNTRY
    );
  }

  // Update merchant profile
  const updatedFields = {
    currency: merchantConstants.MERCHANT_SETTINGS.COUNTRY_CURRENCY_MAP[country] || merchantConstants.MERCHANT_SETTINGS.DEFAULT_CURRENCY,
    updated_at: new Date(),
  };

  await merchant.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.SET_MERCHANT_COUNTRY,
    userId: merchant.user_id,
    role: 'merchant',
    details: { country, currency: updatedFields.currency },
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { merchantId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage(
      'merchant',
      'profile',
      merchant.preferred_language,
      'profile.country_updated',
      { country }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    languageCode: merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${merchant.user_id}`, 'profile:country_updated', {
    userId: merchant.user_id,
    merchantId,
    country,
  });

  logger.info('Merchant country settings updated successfully', { merchantId, country });
  return merchant;
});

/**
 * Manages localization settings to align with customer localization.
 * @param {string} merchantId - Merchant ID.
 * @param {Object} settings - Localization settings (e.g., language).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Updated merchant profile.
 */
const manageLocalization = catchAsync(async (merchantId, settings, ipAddress) => {
  const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }] });
  if (!merchant) {
    throw new AppError(
      'Merchant not found',
      404,
      merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
    );
  }

  const { language } = settings;

  // Validate language
  if (language && !['en', 'fr', 'es'].includes(language)) {
    throw new AppError(
      'Unsupported language',
      400,
      merchantConstants.ERROR_CODES.INVALID_LANGUAGE
    );
  }

  // Update merchant profile
  const updatedFields = {
    preferred_language: language || merchant.preferred_language,
    updated_at: new Date(),
  };

  await merchant.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.MANAGE_MERCHANT_LOCALIZATION,
    userId: merchant.user_id,
    role: 'merchant',
    details: { preferred_language: updatedFields.preferred_language },
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { merchantId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    message: formatMessage(
      'merchant',
      'profile',
      merchant.preferred_language,
      'profile.localization_updated',
      { language: updatedFields.preferred_language }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    languageCode: merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${merchant.user_id}`, 'profile:localization_updated', {
    userId: merchant.user_id,
    merchantId,
    language: updatedFields.preferred_language,
  });

  logger.info('Merchant localization settings updated successfully', { merchantId });
  return merchant;
});

/**
 * Awards gamification points for profile completion.
 * @param {string} merchantId - Merchant ID.
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Gamification points record.
 */
const trackProfileGamification = catchAsync(async (merchantId, ipAddress) => {
  const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }] });
  if (!merchant) {
    throw new AppError(
      'Merchant not found',
      404,
      merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
    );
  }

  const pointsRecord = await gamificationService.awardPoints({
    userId: merchant.user_id,
    role: 'merchant',
    action: merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PROFILE_COMPLETION.action,
    languageCode: merchant.preferred_language,
  });

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.AWARD_MERCHANT_PROFILE_POINTS,
    userId: merchant.user_id,
    role: 'merchant',
    details: { points: pointsRecord.points, action: 'PROFILE_COMPLETION' },
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { merchantId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_UPDATE,
    message: formatMessage(
      'merchant',
      'gamification',
      merchant.preferred_language,
      'gamification.points_awarded',
      { points: pointsRecord.points }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    languageCode: merchant.preferred_language,
  });

  logger.info('Merchant profile completion points awarded successfully', { merchantId, points: pointsRecord.points });
  return pointsRecord;
});

module.exports = {
  updateBusinessDetails,
  setCountrySettings,
  manageLocalization,
  trackProfileGamification,
};