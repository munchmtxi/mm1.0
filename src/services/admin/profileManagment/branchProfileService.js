'use strict';

/**
 * Branch Profile Service (Admin)
 * Manages merchant branch profile operations for admin use, including creation, updates,
 * geofencing, operating hours, and media uploads, aligned with the MerchantBranch model.
 */

const { MerchantBranch, Merchant, Address, Notification, Geofence } = require('@models');
const imageService = require('@services/common/imageService');
const mapService = require('@services/common/mapService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const socketService = require('@services/common/socketService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const { USER_MANAGEMENT_CONSTANTS } = require('@constants/admin/adminCoreConstants');
const catchAsync = require('@utils/catchAsync');

/**
 * Creates a new merchant branch.
 * @param {Object} branchData - Branch data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created branch object.
 */
const createBranch = catchAsync(async (branchData, io) => {
  const requiredFields = ['merchant_id', 'name', 'address', 'contact_phone'];
  validation.validateRequiredFields(branchData, requiredFields);

  await validation.validatePhoneNumber(branchData.contact_phone);

  const merchant = await Merchant.findByPk(branchData.merchant_id);
  if (!merchant) {
    throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
  }

  const branch = await MerchantBranch.create({
    ...branchData,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  });

  await auditService.logAction({
    action: 'CREATE_BRANCH',
    userId: merchant.user_id,
    details: `Branch created for merchant_id: ${branch.merchant_id}, branch_id: ${branch.id}`,
  });

  const message = formatMessage('merchant', 'branch', branchData.preferred_language || 'en', 'branch.created', {
    name: branch.name,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'branch_created',
    message,
  });

  try {
    socketService.emit(io, 'merchant:branch:created', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Branch created for merchant_id: ${branch.merchant_id}, branch_id: ${branch.id}`,
      logType: 'BRANCH_CREATED',
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:branch:created', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `New branch created: ${branch.name} for merchant ${branch.merchant_id}`,
      details: `Branch created for merchant_id: ${branch.merchant_id}, branch_id: ${branch.id}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in createBranch', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Branch created successfully', { branchId: branch.id });
  return branch;
});

/**
 * Updates branch details.
 * @param {string} branchId - Branch ID.
 * @param {Object} details - Updated branch details.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated branch object.
 */
const updateBranchDetails = catchAsync(async (branchId, details, io) => {
  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch) {
    throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
  }

  if (details.contact_phone) {
    await validation.validatePhoneNumber(details.contact_phone);
  }

  const sanitizedData = await securityService.sanitizeInput(details);
  await branch.update(sanitizedData);

  const merchant = await Merchant.findByPk(branch.merchant_id);

  await auditService.logAction({
    action: 'UPDATE_BRANCH',
    userId: merchant.user_id,
    details: `Branch updated for branch_id: ${branchId}`,
  });

  const message = formatMessage('merchant', 'branch', branch.preferred_language || 'en', 'branch.updated', {
    name: branch.name,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'branch_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:branch:updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Branch updated for branch_id: ${branchId}`,
      logType: 'BRANCH_UPDATED',
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:branch:updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Branch updated: ${branch.name} for merchant ${branch.merchant_id}`,
      details: `Branch updated for branch_id: ${branchId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in updateBranchDetails', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Branch details updated', { branchId });
  return branch;
});

/**
 * Configures branch geofencing and delivery radius.
 * @param {string} branchId - Branch ID.
 * @param {Object} geofenceData - Geofence configuration.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated branch object.
 */
const setGeofence = catchAsync(async (branchId, geofenceData, io) => {
  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch) {
    throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
  }

  const geofence = await mapService.createGeofence({
    ...geofenceData,
    branch_id: branchId,
  });

  await branch.update({
    geofence_id: geofence.id,
    updated_at: new Date(),
  });

  const merchant = await Merchant.findByPk(branch.merchant_id);

  await auditService.logAction({
    action: 'SET_BRANCH_GEOFENCE',
    userId: merchant.user_id,
    details: `Geofence set for branch_id: ${branchId}, geofence_id: ${geofence.id}`,
  });

  const message = formatMessage('merchant', 'branch', branch.preferred_language || 'en', 'branch.geofence_updated');

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'geofence_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:branch:geofence_updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Geofence set for branch_id: ${branchId}, geofence_id: ${geofence.id}`,
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:branch:geofence_updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Geofence updated for branch ${branchId}`,
      details: `Geofence set for branch_id: ${branchId}, geofence_id: ${geofence.id}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setGeofence', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Branch geofence updated', { branchId, geofenceId: geofence.id });
  return branch;
});

/**
 * Sets branch operating hours and holidays.
 * @param {string} branchId - Branch ID.
 * @param {Object} hoursData - Operating hours data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated branch object.
 */
const setOperatingHours = catchAsync(async (branchId, hoursData, io) => {
  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch) {
    throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
  }

  validation.validateOperatingHours(hoursData);

  await branch.update({
    operating_hours: hoursData,
    updated_at: new Date(),
  });

  const merchant = await Merchant.findByPk(branch.merchant_id);

  await auditService.logAction({
    action: 'SET_BRANCH_OPERATING_HOURS',
    userId: merchant.user_id,
    details: `Operating hours set for branch_id: ${branchId}`,
  });

  const message = formatMessage('merchant', 'branch', branch.preferred_language || 'en', 'branch.operating_hours_updated');

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'operating_hours_updated',
    message,
  });

  try {
    socketService.emit(io, 'merchant:branch:operating_hours_updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Operating hours set for branch_id: ${branchId}`,
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:branch:operating_hours_updated', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Operating hours updated for branch ${branchId}`,
      details: `Operating hours set for branch_id: ${branchId}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in setOperatingHours', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Branch operating hours updated', { branchId });
  return branch;
});

/**
 * Uploads branch-specific media (e.g., storefront photos).
 * @param {string} branchId - Branch ID.
 * @param {Object} media - Media data.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated branch object.
 */
const uploadMedia = catchAsync(async (branchId, media, io) => {
  const branch = await MerchantBranch.findByPk(branchId);
  if (!branch) {
    throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
  }

  const mediaMetadata = await imageService.uploadMedia(branchId, media);

  const updates = {};
  if (media.type === 'storefront') {
    updates.storefront_image_url = mediaMetadata.url;
  }
  if (Object.keys(updates).length > 0) {
    await branch.update(updates);
  }

  const merchant = await Merchant.findByPk(branch.merchant_id);

  await auditService.logAction({
    action: 'UPLOAD_BRANCH_MEDIA',
    userId: merchant.user_id,
    details: `Media uploaded for branch_id: ${branchId}, type: ${media.type}`,
  });

  const message = formatMessage('merchant', 'branch', branch.preferred_language || 'en', 'branch.media_uploaded', {
    mediaType: media.type,
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    type: 'media_uploaded',
    message,
  });

  try {
    socketService.emit(io, 'merchant:branch:media_uploaded', {
      userId: merchant.user_id,
      role: 'merchant',
      message,
      details: `Media uploaded for branch_id: ${branchId}, type: ${media.type}`,
    }, `user:${merchant.user_id}`);
    socketService.emit(io, 'merchant:branch:media_uploaded', {
      userId: merchant.user_id,
      role: 'merchant',
      message: `Media (${media.type}) uploaded for branch ${branchId}`,
      details: `Media uploaded for branch_id: ${branchId}, type: ${media.type}`,
    }, 'role:admin');
  } catch (error) {
    logger.logErrorEvent('Socket emission failed in uploadMedia', {
      error: error.message,
      userId: merchant.user_id,
    });
  }

  logger.info('Branch media uploaded', { branchId, mediaType: media.type });
  return branch;
});

module.exports = {
  createBranch,
  updateBranchDetails,
  setGeofence,
  setOperatingHours,
  uploadMedia,
};