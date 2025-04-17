'use strict';

const { PROFILE } = require('@constants/customer/profileConstants');
const logger = require('@utils/logger');

const emitProfileUpdated = (io, userId, updatedFields) => {
  logger.info('Emitting profile updated event', { userId, updatedFields });
  io.to(`user:${userId}`).emit(PROFILE.SOCKET_EVENTS.PROFILE_UPDATED, {
    userId,
    updatedFields,
  });
};

const emitFriendRequestSent = (io, fromUserId, toUserId) => {
  logger.info('Emitting friend request sent event', { fromUserId, toUserId });
  io.to(`user:${toUserId}`).emit(PROFILE.SOCKET_EVENTS.FRIEND_REQUEST_SENT, {
    fromUserId,
  });
};

const emitFriendRequestAccepted = (io, fromUserId, toUserId) => {
  logger.info('Emitting friend request accepted event', { fromUserId, toUserId });
  io.to(`user:${toUserId}`).emit(PROFILE.SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, {
    fromUserId,
  });
};

const emitFriendRequestRejected = (io, fromUserId, toUserId) => {
  logger.info('Emitting friend request rejected event', { fromUserId, toUserId });
  io.to(`user:${toUserId}`).emit(PROFILE.SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, {
    fromUserId,
  });
};

const emitFriendRemoved = (io, fromUserId, toUserId) => {
  logger.info('Emitting friend removed event', { fromUserId, toUserId });
  io.to(`user:${toUserId}`).emit(PROFILE.SOCKET_EVENTS.FRIEND_REMOVED, {
    fromUserId,
  });
};

const emitFriendBlocked = (io, fromUserId, toUserId) => {
  logger.info('Emitting friend blocked event', { fromUserId, toUserId });
  io.to(`user:${toUserId}`).emit(PROFILE.SOCKET_EVENTS.FRIEND_BLOCKED, {
    fromUserId,
  });
};

const emitAddressUpdated = (io, userId, action) => {
  logger.info('Emitting address updated event', { userId, action });
  io.to(`user:${userId}`).emit(PROFILE.SOCKET_EVENTS.ADDRESS_UPDATED, {
    userId,
    action,
  });
};

const emitProfilePictureUpdated = (io, userId, avatarUrl) => {
  logger.info('Emitting profile picture updated event', { userId });
  io.to(`user:${userId}`).emit(PROFILE.SOCKET_EVENTS.PROFILE_PICTURE_UPDATED, {
    userId,
    avatarUrl,
  });
};

const emitProfilePictureDeleted = (io, userId) => {
  logger.info('Emitting profile picture deleted event', { userId });
  io.to(`user:${userId}`).emit(PROFILE.SOCKET_EVENTS.PROFILE_PICTURE_DELETED, {
    userId,
  });
};

module.exports = {
  emitProfileUpdated,
  emitFriendRequestSent,
  emitFriendRequestAccepted,
  emitFriendRequestRejected,
  emitFriendRemoved,
  emitFriendBlocked,
  emitAddressUpdated,
  emitProfilePictureUpdated,
  emitProfilePictureDeleted,
};