'use strict';

const socketService = require('@services/common/socketService');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const customerConstants = require('@constants/customer/customerConstants');
const logger = require('@utils/logger');

/**
 * Handles customer order socket events
 */
module.exports = (io, socket) => {
  socket.on(socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE, async (data) => {
    try {
      const { userId, role, order } = data;
      if (role !== 'customer') return;
      const room = `customer:${userId}`;
      await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE, data, room, localizationConstants.DEFAULT_LANGUAGE);
      logger.info('Customer order update emitted', { userId, orderId: order.id });
    } catch (error) {
      logger.error('Customer order update failed', { error: error.message, userId: data?.userId });
    }
  });
};