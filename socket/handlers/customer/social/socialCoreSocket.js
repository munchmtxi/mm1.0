'use strict';

const logger = require('@utils/logger');
const socketConstants = require('@constants/common/socketConstants');

/**
 * Handles socket events for social core.
 */
module.exports = (io, socket) => {
  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_FRIEND_ADD, (data) => {
    logger.logInfoEvent('Friend add event received', data);
    io.to(`customer:${data.friendId}`).emit(socketConstants.SOCIAL_FRIEND_ADD, data);
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_FRIEND_ACCEPT, (data) => {
    logger.logInfoEvent('Friend accept event received', data);
    io.to(`customer:${data.friendId}`).emit(socketConstants.SOCIAL_FRIEND_ACCEPT, data);
  });

  socket.on(socketConstants.SOCKET_EVENT_TYPES.SOCIAL_GROUP_CHAT_MESSAGE, (data) => {
    logger.logInfoEvent('Group chat message event received', data);
    io.to(`chat:${data.chatId}`).emit(socketConstants.SOCIAL_GROUP_CHAT_MESSAGE, data);
  });
};