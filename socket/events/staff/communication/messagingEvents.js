'use strict';

/**
 * messagingEvents.js
 * Socket events for munch communication (staff role).
 * Events: communication:message_received, communication:announcement_broadcast, communication:logs_retrieved, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupMessagingEvents(io, socket) {
  socket.on('munch:communication:message_received', (data) => {
    try {
      socketService.emit(io, 'communication:message_received', {
        messageId: data.messageId,
        senderId: data.senderId,
        content: data.content,
      }, `munch:communication:${data.receiverId}`);
      logger.info('Message received event emitted', data);
    } catch (error) {
      logger.error('Message received event failed', { error: error.message, data });
    }
  });

  socket.on('munch:communication:announcement_broadcast', (data) => {
    try {
      socketService.emit(io, 'communication:announcement_broadcast', {
        shiftId: data.shiftId,
        content: data.content,
      }, `munch:communication:shift_${data.shiftId}`);
      logger.info('Announcement broadcast event emitted', data);
    } catch (error) {
      logger.error('Announcement broadcast event failed', { error: error.message, data });
    }
  });

  socket.on('munch:communication:logs_retrieved', (data) => {
    try {
      socketService.emit(io, 'communication:logs_retrieved', {
        staffId: data.staffId,
        logs: data.logs,
      }, `munch:communication:${data.staffId}`);
      logger.info('Communication logs retrieved event emitted', data);
    } catch (error) {
      logger.error('Communication logs retrieved event failed', { error: error.message, data });
    }
  });

  socket.on('munch:staff:points_awarded', (data) => {
    try {
      socketService.emit(io, 'points:awarded', {
        action: data.action,
        points: data.points,
        userId: data.staffId,
      }, `munch:staff:${data.staffId}`);
      logger.info('Communication points awarded event emitted', data);
    } catch (error) {
      logger.error('Communication points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch communication', { socketId: socket.id });
    setupMessagingEvents(io, socket);
  });
}

module.exports = { initialize };