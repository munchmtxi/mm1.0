'use strict';

const profileService = require('@services/customer/profile/profileService');
const profileEvents = require('@socket/events/customer/profile/profileEvents');
const { PROFILE } = require('@constants/customer/profileConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsyncSocket = require('@utils/catchAsyncSocket');
const tokenService = require('@services/common/tokenService');

const authenticateSocket = async (socket, next) => {
  const token = socket.handshake.auth.token?.replace('Bearer ', '');
  if (!token) {
    logger.warn('No token provided for socket authentication', { socketId: socket.id });
    return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = await tokenService.verifyToken(token);
    socket.user = { id: payload.id, role: payload.role };
    logger.info('Socket authenticated', { socketId: socket.id, userId: socket.user.id });
    next();
  } catch (error) {
    logger.error('Socket authentication failed', { socketId: socket.id, error: error.message });
    next(error);
  }
};

const validateSocketData = (data, type) => {
  const errors = [];
  if (type === 'profile') {
    if (data.first_name && (typeof data.first_name !== 'string' || data.first_name.length < 2 || data.first_name.length > 50)) {
      errors.push('First name must be a string between 2 and 50 characters');
    }
    if (data.last_name && (typeof data.last_name !== 'string' || data.last_name.length < 2 || data.last_name.length > 50)) {
      errors.push('Last name must be a string between 2 and 50 characters');
    }
    if (data.phone && !/^\+?\d{10,15}$/.test(data.phone)) {
      errors.push('Invalid phone number');
    }
    if (data.socialSettings) {
      if (data.socialSettings.profileVisibility && !Object.values(PROFILE.VISIBILITY).includes(data.socialSettings.profileVisibility)) {
        errors.push(`Profile visibility must be one of: ${Object.values(PROFILE.VISIBILITY).join(', ')}`);
      }
      if (data.socialSettings.friendRequests && !Object.values(PROFILE.FRIEND_REQUEST_STATUS).includes(data.socialSettings.friendRequests)) {
        errors.push(`Friend request status must be one of: ${Object.values(PROFILE.FRIEND_REQUEST_STATUS).join(', ')}`);
      }
      if (data.socialSettings.shareActivity !== undefined && typeof data.socialSettings.shareActivity !== 'boolean') {
        errors.push('Share activity must be a boolean');
      }
    }
    if (data.privacySettings) {
      if (data.privacySettings.showOnlineStatus !== undefined && typeof data.privacySettings.showOnlineStatus !== 'boolean') {
        errors.push('Show online status must be a boolean');
      }
      if (data.privacySettings.allowPublicPosts !== undefined && typeof data.privacySettings.allowPublicPosts !== 'boolean') {
        errors.push('Allow public posts must be a boolean');
      }
      if (data.privacySettings.shareProfileDetails && !Object.values(PROFILE.VISIBILITY).includes(data.privacySettings.shareProfileDetails)) {
        errors.push(`Share profile details must be one of: ${Object.values(PROFILE.VISIBILITY).join(', ')}`);
      }
      if (data.privacySettings.allowFriendSuggestions !== undefined && typeof data.privacySettings.allowFriendSuggestions !== 'boolean') {
        errors.push('Allow friend suggestions must be a boolean');
      }
    }
  } else if (type === 'friend') {
    if (!data.action || !Object.values(PROFILE.ACTIONS.FRIEND).includes(data.action)) {
      errors.push(`Action must be one of: ${Object.values(PROFILE.ACTIONS.FRIEND).join(', ')}`);
    }
    if (!data.friendId || !Number.isInteger(data.friendId) || data.friendId < 1) {
      errors.push('Friend ID must be a valid user ID');
    }
  } else if (type === 'address') {
    if (!data.action || !Object.values(PROFILE.ACTIONS.ADDRESS).includes(data.action)) {
      errors.push(`Action must be one of: ${Object.values(PROFILE.ACTIONS.ADDRESS).join(', ')}`);
    }
    if (data.action === PROFILE.ACTIONS.ADDRESS.ADD && (!data.addressData || typeof data.addressData !== 'object')) {
      errors.push('Address data is required for add action');
    }
    if ([PROFILE.ACTIONS.ADDRESS.REMOVE, PROFILE.ACTIONS.ADDRESS.SET_DEFAULT].includes(data.action) &&
        (!data.addressData?.id || !Number.isInteger(data.addressData.id) || data.addressData.id < 1)) {
      errors.push('Address ID is required for remove or setDefault actions');
    }
  }
  if (errors.length > 0) {
    throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', errors);
  }
};

const setupProfileHandlers = (io, socket) => {
  logger.info('Setting up profile socket handlers', { socketId: socket.id, userId: socket.user?.id });

  socket.on(
    'profile:update',
    catchAsyncSocket(async (data) => {
      validateSocketData(data, 'profile');
      const userId = socket.user.id;
      const updatedProfile = await profileService.updateProfile(userId, data);
      socket.emit('profile:update:success', { status: 'success', data: updatedProfile });
      profileEvents.emitProfileUpdated(io, userId, Object.keys(data));
    }, socket)
  );

  socket.on(
    'friend:manage',
    catchAsyncSocket(async (data) => {
      validateSocketData(data, 'friend');
      const userId = socket.user.id;
      const { action, friendId } = data;
      const updatedConnections = await profileService.manageFriends(userId, action, friendId);
      socket.emit('friend:manage:success', { status: 'success', data: updatedConnections });

      if (action === PROFILE.ACTIONS.FRIEND.ADD) {
        profileEvents.emitFriendRequestSent(io, userId, farmerId);
      } else if (action === PROFILE.ACTIONS.FRIEND.ACCEPT) {
        profileEvents.emitFriendRequestAccepted(io, userId, friendId);
      } else if (action === PROFILE.ACTIONS.FRIEND.REJECT) {
        profileEvents.emitFriendRequestRejected(io, userId, friendId);
      } else if (action === PROFILE.ACTIONS.FRIEND.REMOVE) {
        profileEvents.emitFriendRemoved(io, userId, friendId);
      } else if (action === PROFILE.ACTIONS.FRIEND.BLOCK) {
        profileEvents.emitFriendBlocked(io, userId, friendId);
      }
    }, socket)
  );

  socket.on(
    'address:manage',
    catchAsyncSocket(async (data) => {
      validateSocketData(data, 'address');
      const userId = socket.user.id;
      const { action, addressData } = data;
      const savedAddresses = await profileService.manageAddresses(userId, action, addressData);
      socket.emit('address:manage:success', { status: 'success', data: savedAddresses });
      profileEvents.emitAddressUpdated(io, userId, action);
    }, socket)
  );
};

module.exports = { setupProfileHandlers, authenticateSocket };