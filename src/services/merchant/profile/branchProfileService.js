'use strict';

/**
 * Branch Profile Service
 * Manages branch-specific operations, including branch details, settings, media uploads, and profile
 * synchronization for the Merchant Role System. Integrates with merchantConstants.js for configuration
 * and ensures compliance with security and localization requirements.
 *
 * Last Updated: May 15, 2025
 */

const { MerchantBranch, Merchant, Media } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const imageService = require('@services/common/imageService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const catchAsync = require('@utils/catchAsync');

/**
 * Updates branch hours or location.
 * @param {string} branchId - Branch ID.
 * @param {Object} details - Branch details (e.g., operatingHours, location, contactPhone).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Updated branch.
 */
const updateBranchDetails = catchAsync(async (branchId, details, ipAddress) => {
  const branch = await MerchantBranch.findByPk(branchId, { include: [{ model: Merchant, as: 'merchant' }] });
  if (!branch) {
    throw new AppError(
      'Branch not found',
      404,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    );
  }

  const { operatingHours, location, contactPhone } = details;

  // Validate operating hours
  if (operatingHours && (!operatingHours.open || !operatingHours.close)) {
    throw new AppError(
      'Operating hours must include open and close times',
      400,
      merchantConstants.ERROR_CODES.INVALID_OPERATING_HOURS
    );
  }

  // Validate contact phone
  if (contactPhone && !validation.validatePhone(contactPhone)) {
    throw new AppError(
      'Invalid contact phone number format',
      400,
      merchantConstants.ERROR_CODES.INVALID_PHONE
    );
  }

  // Validate and resolve location
  let resolvedLocation = null;
  if (location) {
    resolvedLocation = await locationService.resolveLocation(location);
    if (!merchantConstants.MERCHANT_SETTINGS.SUPPORTED_CITIES[resolvedLocation.countryCode]) {
      throw new AppError(
        'Unsupported location',
        400,
        merchantConstants.ERROR_CODES.UNSUPPORTED_LOCATION
      );
    }
  }

  // Update branch
  const updatedFields = {
    operating_hours: operatingHours || branch.operating_hours,
    location: resolvedLocation ? resolvedLocation : branch.location,
    contact_phone: contactPhone || branch.contact_phone,
    updated_at: new Date(),
  };

  await branch.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.UPDATE_BRANCH_DETAILS,
    userId: branch.merchant.user_id,
    role: 'merchant',
    details: updatedFields,
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { branchId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.BRANCH_UPDATED,
    message: formatMessage(
      'merchant',
      'branch',
      branch.merchant.preferred_language,
      'branch.updated',
      { branchId }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    languageCode: branch.merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${branch.merchant.user_id}`, 'branch:updated', {
    userId: branch.merchant.user_id,
    branchId,
    updatedFields,
  });

  logger.info('Branch details updated successfully', { branchId });
  return branch;
});

/**
 * Configures branch-specific currency and language settings.
 * @param {string} branchId - Branch ID.
 * @param {Object} settings - Settings (e.g., currency, language).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Updated branch.
 */
const configureBranchSettings = catchAsync(async (branchId, settings, ipAddress) => {
  const branch = await MerchantBranch.findByPk(branchId, { include: [{ model: Merchant, as: 'merchant' }] });
  if (!branch) {
    throw new AppError(
      'Branch not found',
      404,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    );
  }

  const { currency, language } = settings;

  // Validate currency
  if (currency && !merchantConstants.MERCHANT_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError(
      'Unsupported currency',
      400,
      merchantConstants.ERROR_CODES.INVALID_CURRENCY
    );
  }

  // Validate language
  if (language && !['en', 'fr', 'es'].includes(language)) {
    throw new AppError(
      'Unsupported language',
      400,
      merchantConstants.ERROR_CODES.INVALID_LANGUAGE
    );
  }

  // Update branch
  const updatedFields = {
    currency: currency || branch.currency,
    preferred_language: language || branch.preferred_language,
    updated_at: new Date(),
  };

  await branch.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.CONFIGURE_BRANCH_SETTINGS,
    userId: branch.merchant.user_id,
    role: 'merchant',
    details: updatedFields,
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { branchId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.BRANCH_UPDATED,
    message: formatMessage(
      'merchant',
      'branch',
      branch.merchant.preferred_language,
      'branch.settings_updated',
      { branchId }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    languageCode: branch.merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${branch.merchant.user_id}`, 'branch:settings_updated', {
    userId: branch.merchant.user_id,
    branchId,
    settings: updatedFields,
  });

  logger.info('Branch settings configured successfully', { branchId });
  return branch;
});

/**
 * Uploads branch-specific media (e.g., photos, videos).
 * @param {string} branchId - Branch ID.
 * @param {Object} media - Media data (e.g., file, type).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<string>} URL of the uploaded media.
 */
const manageBranchMedia = catchAsync(async (branchId, media, ipAddress) => {
  const branch = await MerchantBranch.findByPk(branchId, { include: [{ model: Merchant, as: 'merchant' }] });
  if (!branch) {
    throw new AppError(
      'Branch not found',
      404,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    );
  }

  const { file, type } = media;

  // Validate media type
  if (!['menu_photos', 'promotional_media', 'branch_media', 'banner', 'promo_video'].includes(type)) {
    throw new AppError(
      'Invalid media type',
      400,
      merchantConstants.ERROR_CODES.INVALID_MEDIA_TYPE
    );
  }

  // Validate file
  if (!file || !file.originalname) {
    throw new AppError(
      'Invalid file data',
      400,
      merchantConstants.ERROR_CODES.INVALID_FILE_DATA
    );
  }

  const imageUrl = await imageService.uploadImage(branch.id, file, type);

  // Save media record
  const mediaRecord = await Media.create({
    branch_id: branchId,
    merchant_id: branch.merchant_id,
    type,
    url: imageUrl,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.UPLOAD_BRANCH_MEDIA,
    userId: branch.merchant.user_id,
    role: 'merchant',
    details: { branchId, type, url: imageUrl },
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { mediaId: mediaRecord.id },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPLOADED,
    message: formatMessage(
      'merchant',
      'media',
      branch.merchant.preferred_language,
      'media.uploaded',
      { branchId }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
    languageCode: branch.merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${branch.merchant.user_id}`, 'media:uploaded', {
    userId: branch.merchant.user_id,
    branchId,
    mediaId: mediaRecord.id,
    imageUrl,
  });

  logger.info('Branch media uploaded successfully', { branchId, mediaId: mediaRecord.id });
  return imageUrl;
});

/**
 * Ensures consistency across multiple branch profiles.
 * @param {string} merchantId - Merchant ID.
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Array>} Updated branches.
 */
const syncBranchProfiles = catchAsync(async (merchantId, ipAddress) => {
  const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }] });
  if (!merchant) {
    throw new AppError(
      'Merchant not found',
      404,
      merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
    );
  }

  const branches = await MerchantBranch.findAll({ where: { merchant_id: merchantId } });
  if (!branches.length) {
    throw new AppError(
      'No branches found',
      404,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    );
  }

  // Sync settings (e.g., currency, language) across branches
  const updatedBranches = await Promise.all(
    branches.map(async (branch) => {
      const updatedFields = {
        currency: merchant.currency || branch.currency,
        preferred_language: merchant.preferred_language || branch.preferred_language,
        updated_at: new Date(),
      };
      await branch.update(updatedFields);
      return branch;
    })
  );

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.SYNC_BRANCH_PROFILES,
    userId: merchant.user_id,
    role: 'merchant',
    details: { merchantId, branchCount: updatedBranches.length },
    ipAddress: ipAddress || '0.0.0.0',
    metadata: { merchantId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchant.id,
    type: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.BRANCH_UPDATED,
    message: formatMessage(
      'merchant',
      'branch',
      merchant.preferred_language,
      'branch.synced',
      { merchantId }
    ),
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
    languageCode: merchant.preferred_language,
  });

  // Emit real-time event
  await socketService.emitToRoom(`merchant:${merchant.user_id}`, 'branch:synced', {
    userId: merchant.user_id,
    merchantId,
    branchCount: updatedBranches.length,
  });

  logger.info('Branch profiles synced successfully', { merchantId, branchCount: updatedBranches.length });
  return updatedBranches;
});

module.exports = {
  updateBranchDetails,
  configureBranchSettings,
  manageBranchMedia,
  syncBranchProfiles,
};