'use strict';

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const merchantConstants = require('@constants/merchant/merchantConstants');

/**
 * Handles accessibility-related socket events.
 */
const accessibilitySocketHandler = (io, socket) => {
  /**
   * Joins merchant-specific room.
   */
  socket.on('JOIN_ACCESSIBILITY_ROOM', ({ merchantId }) => {
    if (!merchantId) {
      logger.error('Invalid merchantId for room join', { merchantId });
      return socket.emit('ERROR', { message: 'Invalid merchantId' });
    }
    const room = `merchant:${merchantId}`;
    socket.join(room);
    logger.info('Merchant joined accessibility room', { merchantId, room });
    socket.emit('ROOM_JOINED', { room });
  });

  /**
   * Handles accessibility updates.
   */
  socket.on('ACCESSIBILITY_UPDATED', async ({ userId, role, action, details }) => {
    try {
      await socketService.emit(io, 'ACCESSIBILITY_UPDATED', {
        userId,
        role,
        action,
        details,
        auditAction: merchantConstants.STAFF_CONSTANTS.DEFAULT_TASK_TYPES.ACCESSIBILITY_UPDATED,
      }, `merchant:${userId}`);
      logger.info('Accessibility update processed', { userId, action });
    } catch (error) {
      logger.error('Failed to process accessibility update', { error: error.message, userId, action });
      socket.emit('ERROR', { message: error.message });
    }
  });
};

module.exports = accessibilitySocketHandler;