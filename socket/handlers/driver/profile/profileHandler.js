'use strict';

/**
 * Driver Profile Socket Handler
 * Handles socket events for driver profile operations, using event constants from profileEvents.js.
 * Manages real-time updates, certification uploads, profile retrieval, and verification.
 *
 * Last Updated: May 15, 2025
 */

const profileService = require('@services/driver/profile/profileService');
const socketService = require('@services/common/socketService');
const profileEvents = require('@socket/events/driver/profile/profileEvents');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const driverConstants = require('@constants/driverConstants');

/**
 * Handles profile update socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains driverId and details.
 */
const handleProfileUpdate = async (socket, { driverId, details }) => {
  if (!driverId || !details) {
    throw new AppError(
      'Missing required fields',
      400,
      driverConstants.ERROR_CODES.INCOMPLETE_PROFILE
    );
  }

  const driver = await profileService.updateProfile(driverId, details);
  await socketService.emitToRoom(`driver:${driver.user_id}`, profileEvents.PROFILE_UPDATED, {
    driverId,
    updatedFields: details,
  });

  socket.emit(profileEvents.PROFILE_UPDATED, { success: true, driver });
};

/**
 * Handles certification upload socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains driverId, file, and type.
 */
const handleCertificationUpload = async (socket, { driverId, file, type }) => {
  if (!driverId || !file || !type) {
    throw new AppError(
      'Missing required fields',
      400,
      driverConstants.ERROR_CODES.INCOMPLETE_PROFILE
    );
  }

  const imageUrl = await profileService.uploadCertification(driverId, { file, type });
  await socketService.emitToRoom(`driver:${socket.user.id}`, profileEvents.CERTIFICATION_UPDATED, {
    driverId,
    type,
    imageUrl,
  });

  socket.emit(profileEvents.CERTIFICATION_UPDATED, { success: true, imageUrl });
};

/**
 * Handles profile get socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains driverId.
 */
const handleProfileGet = async (socket, { driverId }) => {
  if (!driverId) {
    throw new AppError(
      'Missing driver ID',
      400,
      driverConstants.ERROR_CODES.INCOMPLETE_PROFILE
    );
  }

  const driver = await profileService.getProfile(driverId);
  socket.emit(profileEvents.PROFILE_GET, { success: true, driver });
};

/**
 * Handles profile verification socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains driverId.
 */
const handleProfileVerification = async (socket, { driverId }) => {
  if (!driverId) {
    throw new AppError(
      'Missing driver ID',
      400,
      driverConstants.ERROR_CODES.INCOMPLETE_PROFILE
    );
  }

  const complianceStatus = await profileService.verifyProfile(driverId);
  await socketService.emitToRoom(`driver:${socket.user.id}`, profileEvents.PROFILE_VERIFIED, {
    driverId,
    complianceStatus,
  });

  socket.emit(profileEvents.PROFILE_VERIFIED, { success: true, complianceStatus });
};

module.exports = {
  handleProfileUpdate,
  handleCertificationUpload,
  handleProfileGet,
  handleProfileVerification,
};