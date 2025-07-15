'use strict';

const {
  updateBranchDetails,
  configureBranchSettings,
  manageBranchMedia,
  syncBranchProfiles,
} = require('@services/merchant/profile/branchProfileService');
const { MerchantBranch, Merchant } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const updateBranchDetailsController = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const details = req.body;
  const branch = await updateBranchDetails(branchId, details);

  await auditService.logAction({
    userId: branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.PROFILE_CONSTANTS.AUDIT_TYPES.UPDATE_BRANCH_DETAILS,
    details,
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId },
  });

  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    notificationType: merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.BRANCH_UPDATED,
    messageKey: 'profile.branch.updated',
    messageParams: { branchId },
    role: 'merchant',
    module: 'profile',
    languageCode: branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'branch:updated', {
    userId: branch.merchant.user_id,
    branchId,
    updatedFields: details,
  }, `merchant:${branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'branch.updated', { branchId }),
    data: branch,
  });
});

const configureBranchSettingsController = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const settings = req.body;
  const branch = await configureBranchSettings(branchId, settings);

  await auditService.logAction({
    userId: branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.PROFILE_CONSTANTS.AUDIT_TYPES.CONFIGURE_BRANCH_SETTINGS,
    details: settings,
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId },
  });

  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    notificationType: merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.SETTINGS_UPDATED,
    messageKey: 'profile.branch.settings_updated',
    messageParams: { branchId },
    role: 'merchant',
    module: 'profile',
    languageCode: branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'branch:settings_updated', {
    userId: branch.merchant.user_id,
    branchId,
    settings,
  }, `merchant:${branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'branch.settings_updated', { branchId }),
    data: branch,
  });
});

const manageBranchMediaController = catchAsync(async (req, res) => {
  const { branchId } = req.params;
  const media = { file: req.file, type: req.body.type };
  const imageUrl = await manageBranchMedia(branchId, media);

  const branch = await MerchantBranch.findByPk(branchId, { include: [{ model: Merchant, as: 'merchant' }] });

  await auditService.logAction({
    userId: branch.merchant.user_id,
    role: 'merchant',
    action: merchantConstants.PROFILE_CONSTANTS.AUDIT_TYPES.UPLOAD_BRANCH_MEDIA,
    details: { type: media.type, url: imageUrl },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { branchId },
  });

  await notificationService.sendNotification({
    userId: branch.merchant.user_id,
    merchant_id: branch.merchant_id,
    notificationType: merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.MEDIA_UPLOADED,
    messageKey: 'profile.media.uploaded',
    messageParams: { branchId },
    role: 'merchant',
    module: 'profile',
    languageCode: branch.merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'media:uploaded', {
    userId: branch.merchant.user_id,
    branchId,
    imageUrl,
  }, `merchant:${branch.merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'media.uploaded', { branchId }),
    data: { imageUrl },
  });
});

const syncBranchProfilesController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const branches = await syncBranchProfiles(merchantId);

  const merchant = await Merchant.findByPk(merchantId);

  await auditService.logAction({
    userId: merchant.user_id,
    role: 'merchant',
    action: merchantConstants.PROFILE_CONSTANTS.AUDIT_TYPES.SYNC_BRANCH_PROFILES,
    details: { merchantId, branchCount: branches.length },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchant.user_id,
    merchant_id: merchantId,
    notificationType: merchantConstants.PROFILE_CONSTANTS.NOTIFICATION_TYPES.BRANCH_SYNCED,
    messageKey: 'profile.branch.synced',
    messageParams: { merchantId },
    role: 'merchant',
    module: 'profile',
    languageCode: merchant.preferred_language || 'en',
  });

  await socketService.emit(null, 'branch:synced', {
    userId: merchant.user_id,
    merchantId,
    branchCount: branches.length,
  }, `merchant:${merchant.user_id}`);

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'profile', 'en', 'branch.synced', { merchantId }),
    data: branches,
  });
});

module.exports = {
  updateBranchDetailsController,
  configureBranchSettingsController,
  manageBranchMediaController,
  syncBranchProfilesController,
};