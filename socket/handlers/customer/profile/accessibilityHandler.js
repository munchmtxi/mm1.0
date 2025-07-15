'use strict';

/**
 * Handles accessibility-related socket events for customers.
 */

const accessibilityEvents = require('@socket/events/customer/profile/accessibilityEvents');
const logger = require('@utils/logger');

module.exports = (io, socket) => {
  socket.on(accessibilityEvents.SCREEN_READERS_UPDATED, (data) => {
    logger.info('Screen readers updated event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(accessibilityEvents.SCREEN_READERS_UPDATED, data);
  });

  socket.on(accessibilityEvents.FONT_SIZE_UPDATED, (data) => {
    logger.info('Font size updated event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(accessibilityEvents.FONT_SIZE_UPDATED, data);
  });

  socket.on(accessibilityEvents.ACCESSIBILITY_LANGUAGE_UPDATED, (data) => {
    logger.info('Accessibility language updated event received', { userId: data.userId, role: data.role });
    io.to(`customer:${data.userId}`).emit(accessibilityEvents.ACCESSIBILITY_LANGUAGE_UPDATED, data);
  });
};