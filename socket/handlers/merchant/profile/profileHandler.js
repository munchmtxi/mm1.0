'use strict';

/**
 * Merchant Profile Handler
 * Handles WebSocket events for merchant profile operations, including business details,
 * country settings, localization, gamification, media, and branch management. Integrates
 * with merchant profile services for business logic and socketService for real-time communication.
 *
 * Last Updated: May 14, 2025
 */

const merchantProfileService = require('@services/merchant/profile/merchantProfileService');
const merchantMediaService = require('@services/merchant/profile/merchantMediaService');
const branchProfileService = require('@services/merchant/profile/branchProfileService');
const socketService = require('@services/common/socketService');
const profileEvents = require('@socket/events/merchant/profile/profileEvents');
const logger = require('@utils/logger');
const merchantConstants = require('@constants/merchantConstants');
const AppError = require('@utils/AppError');

/**
 * Registers WebSocket event handlers for merchant profile operations.
 * @param {Object} io - Socket.IO server instance.
 */
const registerMerchantProfileHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info('New WebSocket connection established', { socketId: socket.id });

    // Join merchant-specific room
    socket.on('join:merchant', ({ merchantId, userId }) => {
      if (!merchantId || !userId) {
        logger.warn('Invalid merchantId or userId for joining merchant room', { merchantId, userId });
        socket.emit(profileEvents.ERROR, {
          message: 'Invalid merchantId or userId',
          code: merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND,
        });
        return;
      }

      const room = `merchant:${userId}`;
      socket.join(room);
      logger.info('Merchant joined room', { merchantId, userId, room });
    });

    // Handle business details update
    socket.on(profileEvents.UPDATE_BUSINESS_DETAILS, async ({ merchantId, userId, details }) => {
      try {
        if (!merchantId || !userId) {
          throw new AppError(
            'Missing merchantId or userId',
            400,
            merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        const updatedMerchant = await merchantProfileService.updateBusinessDetails(merchantId, details);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.BUSINESS_DETAILS_UPDATED,
          { userId, merchantId, updatedFields: updatedMerchant }
        );
        logger.info('Business details update event processed', { merchantId, userId });
      } catch (error) {
        logger.error('Error handling business details update', { error: error.message, merchantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION,
        });
      }
    });

    // Handle country settings update
    socket.on(profileEvents.SET_COUNTRY_SETTINGS, async ({ merchantId, userId, country }) => {
      try {
        if (!merchantId || !userId || !country) {
          throw new AppError(
            'Missing merchantId, userId, or country',
            400,
            merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        const updatedMerchant = await merchantProfileService.setCountrySettings(merchantId, country);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.COUNTRY_SETTINGS_UPDATED,
          { userId, merchantId, country }
        );
        logger.info('Country settings update event processed', { merchantId, userId });
      } catch (error) {
        logger.error('Error handling country settings update', { error: error.message, merchantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.UNSUPPORTED_COUNTRY,
        });
      }
    });

    // Handle localization settings update
    socket.on(profileEvents.MANAGE_LOCALIZATION, async ({ merchantId, userId, settings }) => {
      try {
        if (!merchantId || !userId) {
          throw new AppError(
            'Missing merchantId or userId',
            400,
            merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        const updatedMerchant = await merchantProfileService.manageLocalization(merchantId, settings);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.LOCALIZATION_UPDATED,
          { userId, merchantId, language: settings.language }
        );
        logger.info('Localization settings update event processed', { merchantId, userId });
      } catch (error) {
        logger.error('Error handling localization settings update', { error: error.message, merchantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.INVALID_LANGUAGE,
        });
      }
    });

    // Handle gamification points tracking
    socket.on(profileEvents.TRACK_PROFILE_GAMIFICATION, async ({ merchantId, userId }) => {
      try {
        if (!merchantId || !userId) {
          throw new AppError(
            'Missing merchantId or userId',
            400,
            merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        const pointsRecord = await merchantProfileService.trackProfileGamification(merchantId);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.GAMIFICATION_POINTS_AWARDED,
          { userId, merchantId, points: pointsRecord.points }
        );
        logger.info('Gamification points tracking event processed', { merchantId, userId });
      } catch (error) {
        logger.error('Error handling gamification points tracking', { error: error.message, merchantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND,
        });
      }
    });

    // Handle menu photos upload
    socket.on(profileEvents.UPLOAD_MENU_PHOTOS, async ({ restaurantId, userId, photos }) => {
      try {
        if (!restaurantId || !userId) {
          throw new AppError(
            'Missing restaurantId or userId',
            400,
            merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
          );
        }

        const photoUrls = await merchantMediaService.uploadMenuPhotos(restaurantId, photos);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.MENU_PHOTOS_UPLOADED,
          { userId, restaurantId, photoCount: photoUrls.length }
        );
        logger.info('Menu photos upload event processed', { restaurantId, userId });
      } catch (error) {
        logger.error('Error handling menu photos upload', { error: error.message, restaurantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.INVALID_FILE_DATA,
        });
      }
    });

    // Handle promotional media management
    socket.on(profileEvents.MANAGE_PROMOTIONAL_MEDIA, async ({ restaurantId, userId, media }) => {
      try {
        if (!restaurantId || !userId) {
          throw new AppError(
            'Missing restaurantId or userId',
            400,
            merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
          );
        }

        const mediaUrl = await merchantMediaService.managePromotionalMedia(restaurantId, media);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.PROMOTIONAL_MEDIA_UPDATED,
          { userId, restaurantId, mediaUrl }
        );
        logger.info('Promotional media management event processed', { restaurantId, userId });
      } catch (error) {
        logger.error('Error handling promotional media management', { error: error.message, restaurantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.INVALID_MEDIA_TYPE,
        });
      }
    });

    // Handle media metadata update
    socket.on(profileEvents.UPDATE_MEDIA_METADATA, async ({ mediaId, userId, metadata }) => {
      try {
        if (!mediaId || !userId) {
          throw new AppError(
            'Missing mediaId or userId',
            400,
            merchantConstants.ERROR_CODES.MEDIA_NOT_FOUND
          );
        }

        const updatedMedia = await merchantMediaService.updateMediaMetadata(mediaId, metadata);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.MEDIA_METADATA_UPDATED,
          { userId, mediaId, metadata }
        );
        logger.info('Media metadata update event processed', { mediaId, userId });
      } catch (error) {
        logger.error('Error handling media metadata update', { error: error.message, mediaId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.INVALID_MEDIA_METADATA,
        });
      }
    });

    // Handle media deletion
    socket.on(profileEvents.DELETE_MEDIA, async ({ mediaId, userId }) => {
      try {
        if (!mediaId || !userId) {
          throw new AppError(
            'Missing mediaId or userId',
            400,
            merchantConstants.ERROR_CODES.MEDIA_NOT_FOUND
          );
        }

        await merchantMediaService.deleteMedia(mediaId);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.MEDIA_DELETED,
          { userId, mediaId }
        );
        logger.info('Media deletion event processed', { mediaId, userId });
      } catch (error) {
        logger.error('Error handling media deletion', { error: error.message, mediaId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.MEDIA_NOT_FOUND,
        });
      }
    });

    // Handle branch details update
    socket.on(profileEvents.UPDATE_BRANCH_DETAILS, async ({ branchId, userId, details }) => {
      try {
        if (!branchId || !userId) {
          throw new AppError(
            'Missing branchId or userId',
            400,
            merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
          );
        }

        const updatedBranch = await branchProfileService.updateBranchDetails(branchId, details);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.BRANCH_DETAILS_UPDATED,
          { userId, branchId, updatedFields: updatedBranch }
        );
        logger.info('Branch details update event processed', { branchId, userId });
      } catch (error) {
        logger.error('Error handling branch details update', { error: error.message, branchId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND,
        });
      }
    });

    // Handle branch settings configuration
    socket.on(profileEvents.CONFIGURE_BRANCH_SETTINGS, async ({ branchId, userId, settings }) => {
      try {
        if (!branchId || !userId) {
          throw new AppError(
            'Missing branchId or userId',
            400,
            merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
          );
        }

        const updatedBranch = await branchProfileService.configureBranchSettings(branchId, settings);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.BRANCH_SETTINGS_CONFIGURED,
          { userId, branchId, settings }
        );
        logger.info('Branch settings configuration event processed', { branchId, userId });
      } catch (error) {
        logger.error('Error handling branch settings configuration', { error: error.message, branchId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.INVALID_CURRENCY,
        });
      }
    });

    // Handle branch media management
    socket.on(profileEvents.MANAGE_BRANCH_MEDIA, async ({ branchId, userId, media }) => {
      try {
        if (!branchId || !userId) {
          throw new AppError(
            'Missing branchId or userId',
            400,
            merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND
          );
        }

        const mediaUrl = await branchProfileService.manageBranchMedia(branchId, media);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.BRANCH_MEDIA_UPDATED,
          { userId, branchId, mediaUrl }
        );
        logger.info('Branch media management event processed', { branchId, userId });
      } catch (error) {
        logger.error('Error handling branch media management', { error: error.message, branchId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.INVALID_MEDIA_TYPE,
        });
      }
    });

    // Handle branch profiles synchronization
    socket.on(profileEvents.SYNC_BRANCH_PROFILES, async ({ merchantId, userId }) => {
      try {
        if (!merchantId || !userId) {
          throw new AppError(
            'Missing merchantId or userId',
            400,
            merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND
          );
        }

        const updatedBranches = await branchProfileService.syncBranchProfiles(merchantId);
        await socketService.emitToRoom(
          `merchant:${userId}`,
          profileEvents.BRANCH_PROFILES_SYNCED,
          { userId, merchantId, branchCount: updatedBranches.length }
        );
        logger.info('Branch profiles sync event processed', { merchantId, userId });
      } catch (error) {
        logger.error('Error handling branch profiles sync', { error: error.message, merchantId });
        socket.emit(profileEvents.ERROR, {
          message: error.message,
          code: error.code || merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND,
        });
      }
    });
  });
};

module.exports = { registerMerchantProfileHandlers };