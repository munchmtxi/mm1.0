'use strict';

/**
 * Merchant Media Service
 * Manages media-related operations, including menu photos, promotional media, metadata updates,
 * and media deletion for the Merchant Role System. Integrates with merchantConstants.js for configuration
 * and ensures compliance with security requirements.
 *
 * Last Updated: May 16, 2025
 */

const { MerchantBranch, Media, Merchant } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const imageService = require('@services/common/imageService');
const auditService = require('@services/common/auditService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization/localization');
const validation = require('@utils/validation');
const catchAsync = require('@utils/catchAsync');

/**
 * Uploads dish photos for a restaurant menu.
 * @param {string} restaurantId - Branch ID (restaurant).
 * @param {Array<Object>} photos - Array of photo files.
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Array<string>>} URLs of the uploaded photos.
 */
const uploadMenuPhotos = catchAsync(async (restaurantId, photos, ipAddress) => {
  const branch = await MerchantBranch.findByPk(restaurantId, { include: [{ model: Merchant, as: 'merchant' }] });
  if (!branch) {
    throw new AppError(
      'Restaurant not found',
      404,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    );
  }

  // Validate photos
  if (!photos || !Array.isArray(photos) || photos.some(photo => !photo.originalname)) {
    throw new AppError(
      'Invalid photo data',
      400,
      merchantConstants.ERROR_CODES.INVALID_FILE_DATA
    );
  }

  const photoUrls = await Promise.all(
    photos.map(async (photo) => {
      const imageUrl = await imageService.uploadImage(restaurantId, photo, 'menu_photos');
      const mediaRecord = await Media.create({
        branch_id: restaurantId,
        merchant_id: branch.merchant_id,
        type: 'menu_photos',
        url: imageUrl,
        created_at: new Date(),
        updated_at: new Date(),
      });
      return { url: imageUrl, mediaId: mediaRecord.id };
    })
  );

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.UPLOAD_MENU_PHOTOS,
    userId: branch.merchant.user_id,
    role: 'merchant',
    details: { restaurantId, photoCount: photoUrls.length, mediaIds: photoUrls.map(p => p.mediaId) },
    ipAddress: ipAddress || null,
    metadata: { branchId: restaurantId },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchantId: branch.merchant_id,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPLOADED,
    messageKey: 'media.menu_uploaded',
    messageParams: { restaurantId },
    role: 'merchant',
    module: 'media',
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
  });

  // Emit real-time event
  await socketService.emit(
    `merchant:${branch.merchant.user_id}`,
    'media:menu_uploaded',
    {
      userId: branch.merchant.user_id,
      restaurantId,
      photoCount: photoUrls.length,
      photoUrls: photoUrls.map(p => p.url),
    }
  );

  logger.info('Menu photos uploaded successfully', { restaurantId, photoCount: photoUrls.length });
  return photoUrls.map(p => p.url);
});

/**
 * Handles promotional media for a restaurant.
 * @param {string} restaurantId - Branch ID (restaurant).
 * @param {Object} media - Promotional media data (e.g., file, type).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<string>} URL of the uploaded media.
 */
const managePromotionalMedia = catchAsync(async (restaurantId, media, ipAddress) => {
  const branch = await MerchantBranch.findByPk(restaurantId, { include: [{ model: Merchant, as: 'merchant' }] });
  if (!branch) {
    throw new AppError(
      'Restaurant not found',
      404,
      merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
    );
  }

  const { file, type } = media;

  // Validate media type
  if (!['banner', 'promo_video'].includes(type)) {
    throw new AppError(
      'Invalid promotional media type',
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

  const imageUrl = await imageService.uploadImage(restaurantId, file, type);

  // Save media record
  const mediaRecord = await Media.create({
    branch_id: restaurantId,
    merchant_id: branch.merchant_id,
    type,
    url: imageUrl,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.UPLOAD_PROMOTIONAL_MEDIA,
    userId: branch.merchant.user_id,
    role: 'merchant',
    details: { restaurantId, type, url: imageUrl, mediaId: mediaRecord.id },
    ipAddress: ipAddress || null,
    metadata: { branchId: restaurantId, mediaId: mediaRecord.id },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchantId: branch.merchant_id,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPLOADED,
    messageKey: 'media.promo_uploaded',
    messageParams: { restaurantId },
    role: 'merchant',
    module: 'media',
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
  });

  // Emit real-time event
  await socketService.emit(
    `merchant:${branch.merchant.user_id}`,
    'media:promo_uploaded',
    {
      userId: branch.merchant.user_id,
      restaurantId,
      mediaId: mediaRecord.id,
      imageUrl,
    }
  );

  logger.info('Promotional media uploaded successfully', { restaurantId, mediaId: mediaRecord.id });
  return imageUrl;
});

/**
 * Edits media metadata.
 * @param {string} mediaId - Media ID.
 * @param {Object} metadata - Metadata (e.g., title, description).
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<Object>} Updated media record.
 */
const updateMediaMetadata = catchAsync(async (mediaId, metadata, ipAddress) => {
  const media = await Media.findByPk(mediaId, { include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] });
  if (!media) {
    throw new AppError(
      'Media not found',
      404,
      merchantConstants.ERROR_CODES.MEDIA_NOT_FOUND
    );
  }

  const { title, description } = metadata;

  // Validate inputs
  if (title && title.length > merchantConstants.MEDIA_CONSTANTS.MAX_TITLE_LENGTH) {
    throw new AppError(
      'Title too long',
      400,
      merchantConstants.ERROR_CODES.INVALID_MEDIA_METADATA
    );
  }
  if (description && description.length > merchantConstants.MEDIA_CONSTANTS.MAX_DESCRIPTION_LENGTH) {
    throw new AppError(
      'Description too long',
      400,
      merchantConstants.ERROR_CODES.INVALID_MEDIA_METADATA
    );
  }

  // Update media
  const updatedFields = {
    title: title || media.title,
    description: description || media.description,
    updated_at: new Date(),
  };

  await media.update(updatedFields);

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.UPDATE_MEDIA_METADATA,
    userId: media.branch.merchant.user_id,
    role: 'merchant',
    details: { mediaId, updatedFields },
    ipAddress: ipAddress || null,
    metadata: { branchId: media.branch_id },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: media.branch.merchant.user_id,
    merchantId: media.merchant_id,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPDATED,
    messageKey: 'media.metadata_updated',
    messageParams: { mediaId },
    role: 'merchant',
    module: 'media',
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
  });

  // Emit real-time event
  await socketService.emit(
    `merchant:${media.branch.merchant.user_id}`,
    'media:metadata_updated',
    {
      userId: media.branch.merchant.user_id,
      mediaId,
      metadata: updatedFields,
    }
  );

  logger.info('Media metadata updated successfully', { mediaId });
  return media;
});

/**
 * Removes outdated media.
 * @param {string} mediaId - Media ID.
 * @param {string} ipAddress - IP address of the request.
 * @returns {Promise<void>}
 */
const deleteMedia = catchAsync(async (mediaId, ipAddress) => {
  const media = await Media.findByPk(mediaId, { include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] });
  if (!media) {
    throw new AppError(
      'Media not found',
      404,
      merchantConstants.ERROR_CODES.MEDIA_NOT_FOUND
    );
  }

  // Delete media file
  if (['banner', 'promo_video'].includes(media.type)) {
    await imageService.deleteBannerImage(media.url);
  } else {
    await imageService.deleteImage(media.branch_id, media.type);
  }

  // Delete media record
  await media.destroy();

  // Log audit event
  await auditService.logAction({
    action: merchantConstants.STAFF_CONSTANTS.TASK_TYPES.DELETE_MEDIA,
    userId: media.branch.merchant.user_id,
    role: 'merchant',
    details: { mediaId, type: media.type },
    ipAddress: ipAddress || null,
    metadata: { branchId: media.branch_id },
  });

  // Notify merchant
  await notificationService.sendNotification({
    userId: media.branch.merchant.user_id,
    merchantId: media.merchant_id,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.MEDIA_DELETED,
    messageKey: 'media.deleted',
    messageParams: { mediaId },
    role: 'merchant',
    module: 'media',
    priority: merchantConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
  });

  // Emit real-time event
  await socketService.emit(
    `merchant:${media.branch.merchant.user_id}`,
    'media:deleted',
    {
      userId: media.branch.merchant.user_id,
      mediaId,
    }
  );

  logger.info('Media deleted successfully', { mediaId });
});

module.exports = {
  uploadMenuPhotos,
  managePromotionalMedia,
  updateMediaMetadata,
  deleteMedia,
};