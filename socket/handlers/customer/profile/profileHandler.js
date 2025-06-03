'use strict';

/**
 * Customer Profile Socket Handler
 * Handles socket events for customer profile operations, using event constants from profileEvents.js.
 * Manages real-time updates, country/language settings, dietary preferences, profile retrieval,
 * and gamification points awarding.
 *
 * Last Updated: May 15, 2025
 */

const profileService = require('@services/customer/profile/profileService');
const socketService = require('@services/common/socketService');
const profileEvents = require('@socket/events/customer/profile/profileEvents');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Handles profile update socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains userId and profileData.
 */
const handleProfileUpdate = async (socket, { userId, profileData }) => {
  if (!userId || !profileData) {
    throw new AppError(
      'Missing required fields',
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }

  const customer = await profileService.updateProfile(userId, profileData);
  await socketService.emitToRoom(`customer:${userId}`, profileEvents.PROFILE_UPDATED, {
    userId,
    customerId: customer.id,
    updatedFields: profileData,
  });

  socket.emit(profileEvents.PROFILE_UPDATED, { success: true, customer });
};

/**
 * Handles set country socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains userId and countryCode.
 */
const handleSetCountry = async (socket, { userId, countryCode }) => {
  if (!userId || !countryCode) {
    throw new AppError(
      'Missing required fields',
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }

  const customer = await profileService.setCountry(userId, countryCode);
  await socketService.emitToRoom(`customer:${userId}`, profileEvents.COUNTRY_UPDATED, {
    userId,
    customerId: customer.id,
    countryCode,
  });

  socket.emit(profileEvents.COUNTRY_UPDATED, { success: true, customer });
};

/**
 * Handles set language socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains userId and languageCode.
 */
const handleSetLanguage = async (socket, { userId, languageCode }) => {
  if (!userId || !languageCode) {
    throw new AppError(
      'Missing required fields',
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }

  const customer = await profileService.setLanguage(userId, languageCode);
  await socketService.emitToRoom(`customer:${userId}`, profileEvents.LANGUAGE_UPDATED, {
    userId,
    customerId: customer.id,
    languageCode,
  });

  socket.emit(profileEvents.LANGUAGE_UPDATED, { success: true, customer });
};

/**
 * Handles set dietary preferences socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains userId and preferences.
 */
const handleSetDietaryPreferences = async (socket, { userId, preferences }) => {
  if (!userId || !preferences) {
    throw new AppError(
      'Missing required fields',
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }

  const customer = await profileService.setDietaryPreferences(userId, preferences);
  await socketService.emitToRoom(`customer:${userId}`, profileEvents.DIETARY_UPDATED, {
    userId,
    customerId: customer.id,
    preferences,
  });

  socket.emit(profileEvents.DIETARY_UPDATED, { success: true, customer });
};

/**
 * Handles profile get socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains userId.
 */
const handleGetProfile = async (socket, { userId }) => {
  if (!userId) {
    throw new AppError(
      'Missing user ID',
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }

  const customer = await profileService.getProfile(userId);
  socket.emit(profileEvents.PROFILE_GET, { success: true, customer });
};

/**
 * Handles award profile points socket event.
 * @param {Object} socket - Socket instance.
 * @param {Object} payload - Contains userId.
 */
const handleAwardProfilePoints = async (socket, { userId }) => {
  if (!userId) {
    throw new AppError(
      'Missing user ID',
      400,
      customerConstants.ERROR_CODES.INVALID_CUSTOMER
    );
  }

  const pointsRecord = await profileService.awardProfilePoints(userId);
  await socketService.emitToRoom(`customer:${userId}`, profileEvents.POINTS_AWARDED, {
    userId,
    customerId: pointsRecord.customerId,
    points: pointsRecord.points,
  });

  socket.emit(profileEvents.POINTS_AWARDED, { success: true, pointsRecord });
};

module.exports = {
  handleProfileUpdate,
  handleSetCountry,
  handleSetLanguage,
  handleSetDietaryPreferences,
  handleGetProfile,
  handleAwardProfilePoints,
};