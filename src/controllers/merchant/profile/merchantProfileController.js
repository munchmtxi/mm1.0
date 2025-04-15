'use strict';

const merchantProfileService = require('@services/merchant/profile/merchantProfileService');
const branchProfileService = require('@services/merchant/profile/branchProfileService');
const merchantMediaService = require('@services/merchant/profile/merchantMediaService');
const mapService = require('@services/common/mapService');
const profileEvents = require('@socket/events/merchant/profile/profileEvents');
const merchantRooms = require('@socket/rooms/merchantRooms');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

module.exports = {
  getProfile: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    const includeBranches = req.query.includeBranches === 'true';
    const token = req.headers.authorization.split('Bearer ')[1];

    logger.logApiEvent('Fetching merchant profile', { merchantId, includeBranches });

    const merchant = await merchantProfileService.getProfile(merchantId, includeBranches, token);
    return res.status(200).json({
      status: 'success',
      data: merchant,
    });
  }),

  updateProfile: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    const updateData = req.body;
    const token = req.headers.authorization.split('Bearer ')[1];

    logger.logApiEvent('Updating merchant profile', { merchantId, fields: Object.keys(updateData) });

    const merchant = await merchantProfileService.updateProfile(merchantId, updateData, token);

    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.PROFILE_UPDATED, {
      merchant,
      updatedFields: Object.keys(updateData),
    });
    req.io.to(merchantRooms.ADMIN_ROOM).emit(profileEvents.PROFILE_UPDATED, {
      merchantId,
      updatedFields: Object.keys(updateData),
    });

    return res.status(200).json({
      status: 'success',
      data: merchant,
    });
  }),

  updateNotificationPreferences: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    const preferences = req.body;
    const token = req.headers.authorization.split('Bearer ')[1];

    logger.logApiEvent('Updating notification preferences', { merchantId });

    const updatedPreferences = await merchantProfileService.updateNotificationPreferences(merchantId, preferences, token);

    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.NOTIFICATIONS_UPDATED, {
      preferences: updatedPreferences,
    });

    return res.status(200).json({
      status: 'success',
      data: updatedPreferences,
    });
  }),

  changePassword: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { oldPassword, newPassword, confirmNewPassword, deviceId = 'unknown', deviceType = 'unknown' } = req.body;
    const clientIp = req.ip;

    logger.logSecurityEvent('Password change requested', { userId, clientIp });

    const result = await merchantProfileService.changePassword(
      userId,
      { oldPassword, newPassword, confirmNewPassword },
      clientIp,
      deviceId,
      deviceType
    );

    const merchantId = req.user.merchant_id;
    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.PASSWORD_CHANGED, {
      message: 'Password changed successfully',
    });
    req.io.to(merchantRooms.ADMIN_ROOM).emit(profileEvents.PASSWORD_CHANGED, {
      merchantId,
      timestamp: new Date(),
    });

    return res.status(200).json({
      status: 'success',
      data: { accessToken: result.accessToken, jti: result.jti },
      message: 'Password changed successfully',
    });
  }),

  updateGeolocation: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    const locationData = req.body;
    const token = req.headers.authorization.split('Bearer ')[1];

    logger.logApiEvent('Updating merchant geolocation', { merchantId });

    const result = await merchantProfileService.updateGeolocation(merchantId, locationData, token);

    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.GEOLOCATION_UPDATED, {
      address: result.address,
      location: result.merchant.location,
    });

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  createBranchProfile: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    const branchData = req.body;
    const files = req.files || {};

    logger.logApiEvent('Creating branch profile', { merchantId });

    const branch = await branchProfileService.createBranchProfile(merchantId, branchData, files);

    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.BRANCH_CREATED, {
      branch,
    });
    req.io.to(merchantRooms.getBranchRoom(branch.id)).emit(profileEvents.BRANCH_CREATED, {
      branch,
    });
    req.io.to(merchantRooms.ADMIN_ROOM).emit(profileEvents.BRANCH_CREATED, {
      merchantId,
      branchId: branch.id,
    });

    return res.status(201).json({
      status: 'success',
      data: branch,
    });
  }),

  getBranchProfile: catchAsync(async (req, res, next) => {
    const { branchId } = req.params;

    logger.logApiEvent('Fetching branch profile', { branchId });

    const branch = await branchProfileService.getBranchProfile(branchId);
    return res.status(200).json({
      status: 'success',
      data: branch,
    });
  }),

  updateBranchProfile: catchAsync(async (req, res, next) => {
    const { branchId } = req.params;
    const branchData = req.body;
    const files = req.files || {};

    logger.logApiEvent('Updating branch profile', { branchId });

    const branch = await branchProfileService.updateBranchProfile(branchId, branchData, files);

    const merchantId = req.user.merchant_id;
    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.BRANCH_UPDATED, {
      branch,
    });
    req.io.to(merchantRooms.getBranchRoom(branch.id)).emit(profileEvents.BRANCH_UPDATED, {
      branch,
    });

    return res.status(200).json({
      status: 'success',
      data: branch,
    });
  }),

  deleteBranchProfile: catchAsync(async (req, res, next) => {
    const { branchId } = req.params;

    logger.logApiEvent('Deleting branch profile', { branchId });

    await branchProfileService.deleteBranchProfile(branchId);

    const merchantId = req.user.merchant_id;
    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.BRANCH_DELETED, {
      branchId,
    });
    req.io.to(merchantRooms.getBranchRoom(branchId)).emit(profileEvents.BRANCH_DELETED, {
      branchId,
    });

    return res.status(204).json({
      status: 'success',
      message: 'Branch deleted successfully',
    });
  }),

  listBranchProfiles: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    logger.logApiEvent('Listing branch profiles', { merchantId });

    const branches = await branchProfileService.listBranchProfiles(merchantId);
    return res.status(200).json({
      status: 'success',
      data: branches,
    });
  }),

  bulkUpdateBranches: catchAsync(async (req, res, next) => {
    const merchantId = req.user.merchant_id;
    const updateData = req.body; // Fix: Use req.body directly
    logger.logApiEvent('Bulk updating branches', { merchantId, count: updateData.length });

    const branches = await branchProfileService.bulkUpdateBranches(merchantId, updateData);

    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.BRANCHES_BULK_UPDATED, {
      branches,
    });
    branches.forEach((branch) => {
      req.io.to(merchantRooms.getBranchRoom(branch.id)).emit(profileEvents.BRANCH_UPDATED, {
        branch,
      });
    });

    return res.status(200).json({
      status: 'success',
      data: branches,
    });
  }),

  updateMerchantMedia: catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const mediaData = req.body;
    const files = req.files || {};

    logger.debug('updateMerchantMedia input', {
      userId,
      merchantId: req.user.merchant_id,
      storefront_url: mediaData.storefront_url,
      logo: files.logo?.[0]?.originalname,
      banner: files.banner?.[0]?.originalname,
      logoPath: files.logo?.[0]?.path,
      bannerPath: files.banner?.[0]?.path,
    });

    logger.logApiEvent('Updating merchant media', { userId });

    const updates = await merchantMediaService.updateMerchantMedia(userId, mediaData, files);

    const merchantId = req.user.merchant_id;
    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.MEDIA_UPDATED, { updates });

    return res.status(200).json({
      status: 'success',
      data: updates,
    });
  }),

  getPlaceDetails: catchAsync(async (req, res, next) => {
    const { placeId } = req.params;
    const sessionToken = req.query.sessionToken;

    logger.logApiEvent('Fetching place details', { placeId });

    const details = await mapService.getPlaceDetails(placeId, sessionToken);

    const merchantId = req.user.merchant_id;
    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.PLACE_DETAILS_RECEIVED, {
      details,
    });

    return res.status(200).json({
      status: 'success',
      data: details,
    });
  }),

  getAddressPredictions: catchAsync(async (req, res, next) => {
    const { input, sessionToken } = req.query;

    if (!input) {
      throw new AppError('Input is required', 400, 'MISSING_INPUT');
    }

    logger.logApiEvent('Fetching address predictions', { input });

    const predictions = await mapService.getAddressPredictions(input, sessionToken);

    const merchantId = req.user.merchant_id;
    req.io.to(merchantRooms.getMerchantRoom(merchantId)).emit(profileEvents.ADDRESS_PREDICTIONS_RECEIVED, {
      predictions,
    });

    return res.status(200).json({
      status: 'success',
      data: predictions,
    });
  }),
};