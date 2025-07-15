'use strict';

/**
 * Socket handler for customer inventory events
 */

const socketService = require('@services/common/socketService');
const inventoryService = require('@services/merchant/inventoryService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Sequelize } = require('sequelize');

/**
 * Handles menu update subscription
 */
async function handleMenuUpdate(io, socket, { restaurantId, userId, role }, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  try {
    const room = `menu:${restaurantId}`;
    socket.join(room);
    logger.info('User subscribed to menu updates', { userId, role, restaurantId, room });

    await auditService.logAction({
      userId: userId || 'anonymous',
      role: role || 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.MENU_SUBSCRIBED,
      details: { restaurantId, room },
      ipAddress: socket.handshake.address
    });

    await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.MENU_SUBSCRIPTION_CONFIRMED, {
      userId: userId || 'anonymous',
      role: role || 'customer',
      restaurantId,
      message: formatMessage('customer', 'menu', languageCode, 'menu_subscription_confirmed')
    }, room, languageCode);
  } catch (error) {
    logger.error('Failed to handle menu update subscription', { error: error.message, userId, restaurantId });
    socket.emit('error', {
      code: error.code || socketConstants.ERROR_CODES.SOCKET_DISCONNECTED,
      message: formatMessage('customer', 'menu', languageCode, 'menu_subscription_failed', { error: error.message })
    });
  }
}

/**
 * Handles item availability updates
 */
async function handleItemAvailabilityUpdate(io, socket, { itemId, userId, role }, languageCode = localizationConstants.DEFAULT_LANGUAGE) {
  try {
    const result = await Sequelize.transaction(async (transaction) => {
      const availability = await inventoryService.checkItemAvailability(itemId, userId, transaction);

      await auditService.logAction({
        userId: userId || 'anonymous',
        role: role || 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ITEM_AVAILABILITY_CHECKED,
        details: { itemId, isAvailable: availability.isAvailable },
        ipAddress: socket.handshake.address
      }, transaction);

      return availability;
    });

    const room = `item:${itemId}`;
    socket.join(room);
    logger.info('User subscribed to item availability updates', { userId, role, itemId, room });

    await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.ITEM_AVAILABILITY_UPDATED, {
      userId: userId || 'anonymous',
      role: role || 'customer',
      itemId,
      isAvailable: result.isAvailable,
      quantityAvailable: result.quantityAvailable,
      message: formatMessage('customer', 'menu', languageCode, 'item_availability_updated')
    }, room, languageCode);
  } catch (error) {
    logger.error('Failed to handle item availability update', { error: error.message, userId, itemId });
    socket.emit('error', {
      code: error.code || socketConstants.ERROR_CODES.SOCKET_DISCONNECTED,
      message: formatMessage('customer', 'menu', languageCode, 'item_availability_update_failed', { error: error.message })
    });
  }
}

module.exports = { handleMenuUpdate, handleItemAvailabilityUpdate };