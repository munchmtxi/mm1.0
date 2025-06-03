'use strict';

/**
 * Merchant Profile Controller
 * Handles HTTP requests for merchant profile operations, including business details,
 * country settings, localization, gamification, media, and branch management. Integrates
 * with merchant profile services for business logic.
 *
 * Last Updated: May 14, 2025
 */

const merchantProfileService = require('@services/merchant/profile/merchantProfileService');
const merchantMediaService = require('@services/merchant/profile/merchantMediaService');
const branchProfileService = require('@services/merchant/profile/branchProfileService');
const logger = require('@utils/logger');
const merchantConstants = require('@constants/merchantConstants');
const { sendResponse } = require('@utils/responseHandler');

/**
 * Updates merchant business details.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const updateBusinessDetails = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const details = req.body;
    const updatedMerchant = await merchantProfileService.updateBusinessDetails(merchantId, details);
    logger.info('Merchant business details updated successfully', { merchantId });
    sendResponse(res, 200, {
      message: merchantConstants.SUCCESS_MESSAGES.MERCHANT_CREATED,
      data: updatedMerchant,
    });
  } catch (error) {
    logger.error('Error updating merchant business details', { error: error.message, merchantId: req.params.merchantId });
    next(error);
  }
};

/**
 * Sets merchant country settings.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const setCountrySettings = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const { country } = req.body;
    const updatedMerchant = await merchantProfileService.setCountrySettings(merchantId, country);
    logger.info('Merchant country settings updated successfully', { merchantId });
    sendResponse(res, 200, {
      message: 'Country settings updated successfully',
      data: updatedMerchant,
    });
  } catch (error) {
    logger.error('Error setting merchant country settings', { error: error.message, merchantId: req.params.merchantId });
    next(error);
  }
};

/**
 * Manages merchant localization settings.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const manageLocalization = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const settings = req.body;
    const updatedMerchant = await merchantProfileService.manageLocalization(merchantId, settings);
    logger.info('Merchant localization settings updated successfully', { merchantId });
    sendResponse(res, 200, {
      message: 'Localization settings updated successfully',
      data: updatedMerchant,
    });
  } catch (error) {
    logger.error('Error managing merchant localization', { error: error.message, merchantId: req.params.merchantId });
    next(error);
  }
};

/**
 * Tracks merchant profile gamification points.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const trackProfileGamification = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const pointsRecord = await merchantProfileService.trackProfileGamification(merchantId);
    logger.info('Merchant profile gamification points awarded successfully', { merchantId });
    sendResponse(res, 200, {
      message: merchantConstants.SUCCESS_MESSAGES.GAMIFICATION_POINTS_AWARDED,
      data: pointsRecord,
    });
  } catch (error) {
    logger.error('Error tracking merchant profile gamification', { error: error.message, merchantId: req.params.merchantId });
    next(error);
  }
};

/**
 * Uploads menu photos for a restaurant.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const uploadMenuPhotos = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const photos = req.files;
    const photoUrls = await merchantMediaService.uploadMenuPhotos(restaurantId, photos);
    logger.info('Menu photos uploaded successfully', { restaurantId });
    sendResponse(res, 200, {
      message: 'Menu photos uploaded successfully',
      data: photoUrls,
    });
  } catch (error) {
    logger.error('Error uploading menu photos', { error: error.message, restaurantId: req.params.restaurantId });
    next(error);
  }
};

/**
 * Manages promotional media for a restaurant.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const managePromotionalMedia = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const media = { file: req.file, type: req.body.type };
    const mediaUrl = await merchantMediaService.managePromotionalMedia(restaurantId, media);
    logger.info('Promotional media managed successfully', { restaurantId });
    sendResponse(res, 200, {
      message: 'Promotional media uploaded successfully',
      data: mediaUrl,
    });
  } catch (error) {
    logger.error('Error managing promotional media', { error: error.message, restaurantId: req.params.restaurantId });
    next(error);
  }
};

/**
 * Updates media metadata.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const updateMediaMetadata = async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    const metadata = req.body;
    const updatedMedia = await merchantMediaService.updateMediaMetadata(mediaId, metadata);
    logger.info('Media metadata updated successfully', { mediaId });
    sendResponse(res, 200, {
      message: 'Media metadata updated successfully',
      data: updatedMedia,
    });
  } catch (error) {
    logger.error('Error updating media metadata', { error: error.message, mediaId: req.params.mediaId });
    next(error);
  }
};

/**
 * Deletes media.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const deleteMedia = async (req, res, next) => {
  try {
    const { mediaId } = req.params;
    await merchantMediaService.deleteMedia(mediaId);
    logger.info('Media deleted successfully', { mediaId });
    sendResponse(res, 200, {
      message: 'Media deleted successfully',
      data: null,
    });
  } catch (error) {
    logger.error('Error deleting media', { error: error.message, mediaId: req.params.mediaId });
    next(error);
  }
};

/**
 * Updates branch details.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const updateBranchDetails = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const details = req.body;
    const updatedBranch = await branchProfileService.updateBranchDetails(branchId, details);
    logger.info('Branch details updated successfully', { branchId });
    sendResponse(res, 200, {
      message: 'Branch details updated successfully',
      data: updatedBranch,
    });
  } catch (error) {
    logger.error('Error updating branch details', { error: error.message, branchId: req.params.branchId });
    next(error);
  }
};

/**
 * Configures branch settings.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const configureBranchSettings = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const settings = req.body;
    const updatedBranch = await branchProfileService.configureBranchSettings(branchId, settings);
    logger.info('Branch settings configured successfully', { branchId });
    sendResponse(res, 200, {
      message: 'Branch settings configured successfully',
      data: updatedBranch,
    });
  } catch (error) {
    logger.error('Error configuring branch settings', { error: error.message, branchId: req.params.branchId });
    next(error);
  }
};

/**
 * Manages branch media.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const manageBranchMedia = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const media = { file: req.file, type: req.body.type };
    const mediaUrl = await branchProfileService.manageBranchMedia(branchId, media);
    logger.info('Branch media managed successfully', { branchId });
    sendResponse(res, 200, {
      message: 'Branch media uploaded successfully',
      data: mediaUrl,
    });
  } catch (error) {
    logger.error('Error managing branch media', { error: error.message, branchId: req.params.branchId });
    next(error);
  }
};

/**
 * Synchronizes branch profiles.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const syncBranchProfiles = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    const updatedBranches = await branchProfileService.syncBranchProfiles(merchantId);
    logger.info('Branch profiles synced successfully', { merchantId });
    sendResponse(res, 200, {
      message: 'Branch profiles synced successfully',
      data: updatedBranches,
    });
  } catch (error) {
    logger.error('Error syncing branch profiles', { error: error.message, merchantId: req.params.merchantId });
    next(error);
  }
};

module.exports = {
  updateBusinessDetails,
  setCountrySettings,
  manageLocalization,
  trackProfileGamification,
  uploadMenuPhotos,
  managePromotionalMedia,
  updateMediaMetadata,
  deleteMedia,
  updateBranchDetails,
  configureBranchSettings,
  manageBranchMedia,
  syncBranchProfiles,
};