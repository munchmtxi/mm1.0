'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const cartEvents = require('@socket/events/customer/mtables/cartEvents');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = (io, socket) => {
  const handleCartEvent = async (event, data) => {
    const { userId, role, cartId, details } = data;
    const languageCode = data.languageCode || localizationConstants.DEFAULT_LANGUAGE;

    if (!userId || role !== 'customer' || !cartId) {
      logger.logWarnEvent('Invalid cart event data', { event, userId, role, cartId });
      return socket.emit('error', { message: 'Invalid event data' });
    }

    try {
      await socketService.emit(io, event, {
        userId,
        role,
        auditAction: details.auditAction,
        details,
      }, `customer:${userId}`, languageCode);
      logger.logApiEvent('Cart socket event handled', { event, userId, cartId });
    } catch (error) {
      logger.logErrorEvent('Cart socket event failed', { event, userId, error: error.message });
      socket.emit('error', { message: error.message });
    }
  };

  socket.on(cartEvents.CART_ADDED, (data) => handleCartEvent(cartEvents.CART_ADDED, data));
  socket.on(cartEvents.CART_UPDATED, (data) => handleCartEvent(cartEvents.CART_UPDATED, data));
  socket.on(cartEvents.CART_CLEARED, (data) => handleCartEvent(cartEvents.CART_CLEARED, data));
};