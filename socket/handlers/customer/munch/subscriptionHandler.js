'use strict';

const socketConstants = require('@constants/common/socketConstants');

/**
 * Handles subscription-related socket events
 */
const subscriptionHandler = (io, socket) => {
  /**
   * Join user to their subscription room
   */
  socket.on('joinSubscriptionRoom', ({ userId }) => {
    if (userId) {
      socket.join(`customer:${userId}`);
    }
  });

  /**
   * Handle subscription enrolled event
   */
  socket.on(socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_ENROLLED, (data) => {
    socket.to(`customer:${data.userId}`).emit(socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_ENROLLED, data);
  });

  /**
   * Handle subscription updated event
   */
  socket.on(socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_UPDATED, (data) => {
    socket.to(`customer:${data.userId}`).emit(socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_UPDATED, data);
  });

  /**
   * Handle subscription renewed event
   */
  socket.on(socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_RENEWED, (data) => {
    socket.to(`customer:${data.userId}`).emit(socketConstants.SOCKET_EVENT_TYPES.SUBSCRIPTION_RENEWED, data);
  });
};

module.exports = subscriptionHandler;