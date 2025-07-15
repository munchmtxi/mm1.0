'use strict';

const logger = require('@utils/logger');
const socketConstants = require('@constants/common/socketConstants');

/**
 * Handles socket events for social content.
 */
module.exports = (io, socket) => {
  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_POST_CREATED, (data) => {
    logger.logInfoEvent('Social post created event received', data);
    io.to(`customer:${data.userId}`).emit(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_POST_CREATED, data);
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_POST_REACTION, (data) => {
    logger.logInfoEvent('Social post reaction event received', data);
    io.to(`customer:${data.userId}`).emit(socketConstants.SOCIAL_POST_REACTION, data);
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_STORY_SHARED, (data) => {
    logger.logInfoEvent('Social story shared event received', data);
    io.to(`customer:${data.userId}`).emit(socketConstants.SOCIAL_STORY_SHARED, data);
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_INVITE_SENT, (data) => {
    logger.logInfoEvent('Social invite sent event received', data);
    io.to(`customer:${data.friendId}`).emit(socketConstants.SOCIAL_INVITE_SENT, data);
  });
};