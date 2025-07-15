'use strict';

const {
  uploadMenuPhotos,
  managePromotionalMedia,
  updateMediaMetadata,
  deleteMedia,
} = require('@services/merchant/profile/merchantMediaService');
const { MerchantBranch, Media } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const uploadMenuPhotosController = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const photos = req.files;
  const photoUrls = await uploadMenuPhotos(restaurantId, photos);

  const branch = await MerchantBranch.findByPk(restaurantId, { include: [{ model: Merchant, as: 'merchant' }] });

  await auditService.logAction({
    userId: branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MEDIA_CONSTANTS.AUDIT_TYPES.UPLOAD_MENU_PHOTOS,
    details: { restaurantId, photoCount: photoUrls.length },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId: restaurantId },
  });

  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    notificationType: merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.MENU_UPLOADED,
    messageKey: 'profile.media.menu_uploaded',
    messageParams: { restaurantId },
    role: 'merchant',
    module: 'profile',
    languageCode: branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'media:menu_uploaded', {
    userId: branch.merchant.user_id,
    restaurantId,
    photoCount: photoUrls.length,
    photoUrls,
  }, `merchant:${branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'media.menu_uploaded', { restaurantId }),
    data: photoUrls,
  });
});

const managePromotionalMediaController = catchAsync(async (req, res) => {
  const { restaurantId } = req.params;
  const media = { file: req.file, type: req.body.type };
  const imageUrl = await managePromotionalMedia(restaurantId, media);

  const branch = await MerchantBranch.findByPk(restaurantId, { include: [{ model: Merchant, as: 'merchant' }] });

  await auditService.logAction({
    userId: branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MEDIA_CONSTANTS.AUDIT_TYPES.UPLOAD_PROMOTIONAL_MEDIA,
    details: { restaurantId, type: media.type, url: imageUrl },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId: restaurantId },
  });

  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    notificationType: merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.PROMO_UPLOADED,
    messageKey: 'profile.media.promo_uploaded',
    messageParams: { restaurantId },
    role: 'merchant',
    module: 'profile',
    languageCode: branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'media:promo_uploaded', {
    userId: branch.merchant.user_id,
    restaurantId,
    imageUrl,
  }, `merchant:${branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'media.promo_uploaded', { restaurantId }),
    data: { imageUrl },
  });
});

const updateMediaMetadataController = catchAsync(async (req, res) => {
  const { mediaId } = req.params;
  const metadata = req.body;
  const updatedFields = await updateMediaMetadata(mediaId, metadata);

  const media = await Media.findByPk(mediaId, { include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }] });

  await auditService.logAction({
    userId: media.branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MEDIA_CONSTANTS.AUDIT_TYPES.UPDATE_MEDIA_METADATA,
    details: { mediaId, updatedFields },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId: media.branch_id },
  });

  await notificationService.sendNotification({
    userId: media.branch.merchant.user_id,
    merchant_id: media.merchant_id,
    notificationType: merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPDATED,
    messageKey: 'profile.media.metadata_updated',
    messageParams: { mediaId },
    role: 'merchant',
    module: 'profile',
    languageCode: media.branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'media:metadata_updated', {
    userId: media.branch.merchant.user_id,
    mediaId,
    metadata: updatedFields,
  }, `merchant:${media.branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'media.metadata_updated', { mediaId }),
    data: updatedFields,
  });
});

const deleteMediaController = catchAsync(async (req, res) => {
  const { mediaId } = req.params;
  await deleteMedia(mediaId);

  const media = await Media.findByPk(mediaId, { include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] }], paranoid: false });

  await auditService.logAction({
    userId: media.branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.MEDIA_CONSTANTS.AUDIT_TYPES.DELETE_MEDIA,
    details: { mediaId, type: media.type },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId: media.branch_id },
  });

  await notificationService.sendNotification({
    userId: media.branch.merchant.user_id,
    merchant_id: media.merchant_id,
    notificationType: merchantConstants.MEDIA_CONSTANTS.NOTIFICATION_TYPES.MEDIA_DELETED,
    messageKey: 'profile.media.deleted',
    messageParams: { mediaId },
    role: 'merchant',
    module: 'profile',
    languageCode: media.branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'media:deleted', {
    userId: media.branch.merchant.user_id,
    mediaId,
  }, `merchant:${media.branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'media.deleted', { mediaId }),
    data: null,
  });
});

module.exports = {
  uploadMenuPhotosController,
  managePromotionalMediaController,
  updateMediaMetadataController,
  deleteMediaController,
};