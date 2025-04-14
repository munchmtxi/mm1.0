'use strict';

const merchantProfileService = require('@services/merchant/profile/merchantProfileService');
const branchProfileService = require('@services/merchant/profile/branchProfileService');
const merchantMediaService = require('@services/merchant/profile/merchantMediaService');
const mapService = require('@services/common/mapService');
const profileEvents = require('@socket/events/merchant/profile/profileEvents');
const merchantRooms = require('@socket/rooms/merchantRooms');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const profileValidator = require('@validators/merchant/profile/profileValidator');
const Joi = require('joi');

const setupProfileHandlers = (io, socket) => {
  const emitError = (event, error) => {
    socket.emit(profileEvents.ERROR, {
      message: error.message,
      code: error.code || 'SOCKET_ERROR',
    });
    logger.logErrorEvent('Socket error emitted', {
      event,
      userId: socket.user.id,
      error: error.message,
    });
  };

  const validateData = async (validatorName, data) => {
    if (!profileValidator[validatorName]) {
      throw new AppError('Invalid validator', 500, 'INVALID_VALIDATOR');
    }
    const { error } = profileValidator[validatorName].validate(data, { abortEarly: false });
    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      throw new AppError(`Validation failed: ${message}`, 400, 'VALIDATION_FAILED');
    }
  };

  socket.on(profileEvents.UPDATE_PROFILE, async (data, callback) => {
    try {
      await validateData('updateProfile', data);
      const merchant = await merchantProfileService.updateProfile(socket.user.id, data);
      const updatedFields = Object.keys(data);

      // Emit to merchant's room
      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.PROFILE_UPDATED, {
        merchant,
        updatedFields,
      });

      // Notify admins
      io.to(merchantRooms.ADMIN_ROOM).emit(profileEvents.PROFILE_UPDATED, {
        merchantId: socket.user.id,
        updatedFields,
      });

      logger.logApiEvent('Socket: Merchant profile updated', {
        userId: socket.user.id,
        updatedFields,
      });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: merchant });
      }
    } catch (error) {
      emitError(profileEvents.UPDATE_PROFILE, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.UPDATE_NOTIFICATIONS, async (data, callback) => {
    try {
      await validateData('updateNotificationPreferences', data);
      const preferences = await merchantProfileService.updateNotificationPreferences(socket.user.id, data);

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.NOTIFICATIONS_UPDATED, {
        preferences,
      });

      logger.logApiEvent('Socket: Notification preferences updated', { userId: socket.user.id });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: preferences });
      }
    } catch (error) {
      emitError(profileEvents.UPDATE_NOTIFICATIONS, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.CHANGE_PASSWORD, async (data, callback) => {
    try {
      await validateData('changePassword', data);
      const clientIp = socket.handshake.address;
      await merchantProfileService.changePassword(socket.user.id, data, clientIp);

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.PASSWORD_CHANGED, {
        message: 'Password changed successfully',
      });

      io.to(merchantRooms.ADMIN_ROOM).emit(profileEvents.PASSWORD_CHANGED, {
        merchantId: socket.user.id,
        timestamp: new Date(),
      });

      logger.logSecurityEvent('Socket: Password changed', { userId: socket.user.id, clientIp });

      if (typeof callback === 'function') {
        callback({ status: 'success', message: 'Password changed' });
      }
    } catch (error) {
      emitError(profileEvents.CHANGE_PASSWORD, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.UPDATE_GEOLOCATION, async (data, callback) => {
    try {
      await validateData('updateGeolocation', data);
      const result = await merchantProfileService.updateGeolocation(socket.user.id, data);

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.GEOLOCATION_UPDATED, {
        address: result.address,
        location: result.merchant.location,
      });

      logger.logApiEvent('Socket: Geolocation updated', { userId: socket.user.id });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: result });
      }
    } catch (error) {
      emitError(profileEvents.UPDATE_GEOLOCATION, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.UPDATE_MEDIA, async (data, callback) => {
    try {
      await validateData('updateMerchantMedia', data);
      // Note: File uploads not supported via sockets; use HTTP for logo/banner
      const updates = await merchantMediaService.updateMerchantMedia(socket.user.id, data, {});

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.MEDIA_UPDATED, {
        updates,
      });

      logger.logApiEvent('Socket: Media updated', { userId: socket.user.id });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: updates });
      }
    } catch (error) {
      emitError(profileEvents.UPDATE_MEDIA, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.CREATE_BRANCH, async (data, callback) => {
    try {
      await validateData('createBranchProfile', data);
      const branch = await branchProfileService.createBranchProfile(socket.user.id, data, {});

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.BRANCH_CREATED, {
        branch,
      });

      io.to(merchantRooms.getBranchRoom(branch.id)).emit(profileEvents.BRANCH_CREATED, {
        branch,
      });

      io.to(merchantRooms.ADMIN_ROOM).emit(profileEvents.BRANCH_CREATED, {
        merchantId: socket.user.id,
        branchId: branch.id,
      });

      logger.logApiEvent('Socket: Branch created', { userId: socket.user.id, branchId: branch.id });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: branch });
      }
    } catch (error) {
      emitError(profileEvents.CREATE_BRANCH, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.UPDATE_BRANCH, async (data, callback) => {
    try {
      await validateData('updateBranchProfile', { branchId: data.branchId, ...data });
      const branch = await branchProfileService.updateBranchProfile(data.branchId, data, {});

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.BRANCH_UPDATED, {
        branch,
      });

      io.to(merchantRooms.getBranchRoom(branch.id)).emit(profileEvents.BRANCH_UPDATED, {
        branch,
      });

      logger.logApiEvent('Socket: Branch updated', { userId: socket.user.id, branchId: branch.id });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: branch });
      }
    } catch (error) {
      emitError(profileEvents.UPDATE_BRANCH, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.DELETE_BRANCH, async (data, callback) => {
    try {
      await validateData('deleteBranchProfile', { branchId: data.branchId });
      await branchProfileService.deleteBranchProfile(data.branchId);

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.BRANCH_DELETED, {
        branchId: data.branchId,
      });

      io.to(merchantRooms.getBranchRoom(data.branchId)).emit(profileEvents.BRANCH_DELETED, {
        branchId: data.branchId,
      });

      logger.logApiEvent('Socket: Branch deleted', { userId: socket.user.id, branchId: data.branchId });

      if (typeof callback === 'function') {
        callback({ status: 'success', message: 'Branch deleted' });
      }
    } catch (error) {
      emitError(profileEvents.DELETE_BRANCH, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.BULK_UPDATE_BRANCHES, async (data, callback) => {
    try {
      await validateData('bulkUpdateBranches', data);
      const branches = await branchProfileService.bulkUpdateBranches(socket.user.id, data);

      io.to(merchantRooms.getMerchantRoom(socket.user.id)).emit(profileEvents.BRANCHES_BULK_UPDATED, {
        branches,
      });

      branches.forEach((branch) => {
        io.to(merchantRooms.getBranchRoom(branch.id)).emit(profileEvents.BRANCH_UPDATED, {
          branch,
        });
      });

      logger.logApiEvent('Socket: Branches bulk updated', {
        userId: socket.user.id,
        count: branches.length,
      });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: branches });
      }
    } catch (error) {
      emitError(profileEvents.BULK_UPDATE_BRANCHES, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.GET_PLACE_DETAILS, async (data, callback) => {
    try {
      await validateData('getPlaceDetails', data);
      const details = await mapService.getPlaceDetails(data.placeId, data.sessionToken);

      socket.emit(profileEvents.PLACE_DETAILS_RECEIVED, { details });

      logger.logApiEvent('Socket: Place details retrieved', { userId: socket.user.id, placeId: data.placeId });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: details });
      }
    } catch (error) {
      emitError(profileEvents.GET_PLACE_DETAILS, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });

  socket.on(profileEvents.GET_ADDRESS_PREDICTIONS, async (data, callback) => {
    try {
      await validateData('getAddressPredictions', data);
      const predictions = await mapService.getAddressPredictions(data.input, data.sessionToken);

      socket.emit(profileEvents.ADDRESS_PREDICTIONS_RECEIVED, { predictions });

      logger.logApiEvent('Socket: Address predictions retrieved', { userId: socket.user.id, input: data.input });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: predictions });
      }
    } catch (error) {
      emitError(profileEvents.GET_ADDRESS_PREDICTIONS, error);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: error.message });
      }
    }
  });
};

module.exports = { setupProfileHandlers };