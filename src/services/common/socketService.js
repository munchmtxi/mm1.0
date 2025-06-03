/**
 * socketService.js
 *
 * Centralized service for managing Socket.IO events across all roles and services.
 * Handles event emission, validation, audit logging, and error handling for admin,
 * customer, driver, merchant, and staff roles. Integrates with mtables, munch, mtxi,
 * and mevents services.
 *
 * Dependencies:
 * - socketConstants.js (event types, audit actions, settings)
 * - logger.js (custom logging)
 * - catchAsyncSocket.js (async error handling)
 *
 * Last Updated: May 28, 2025
 */

'use strict';

const logger = require('@utils/logger');
const socketConstants = require('@constants/common/socketConstants');
const catchAsyncSocket = require('@utils/catchAsyncSocket');

/**
 * Emits a socket event to a specific room or all connected clients
 * @param {Object} io - Socket.IO instance
 * @param {string} event - Event name
 * @param {Object} data - Event data
 * @param {string} [room=null] - Target room (optional)
 */
const emit = catchAsyncSocket(async (io, event, data, room = null) => {
  if (!io) {
    throw new Error('Socket.IO instance is required');
  }
  if (!event || typeof event !== 'string' || !socketConstants.SOCKET_EVENT_TYPES[event.toUpperCase()]) {
    throw new Error(socketConstants.ERROR_CODES.INVALID_EVENT);
  }
  if (room && typeof room !== 'string') {
    throw new Error(socketConstants.ERROR_CODES.INVALID_ROOM);
  }
  if (data && JSON.stringify(data).length > socketConstants.SOCKET_SETTINGS.MAX_EVENT_PAYLOAD_SIZE_MB * 1024 * 1024) {
    throw new Error(socketConstants.ERROR_CODES.PAYLOAD_TOO_LARGE);
  }

  const eventData = {
    ...data,
    timestamp: new Date(),
  };

  // Emit to room or broadcast
  if (room) {
    io.to(room).emit(event, eventData);
    logger.info(socketConstants.SUCCESS_MESSAGES.EVENT_EMITTED, {
      event,
      room,
      userId: data?.userId,
      role: data?.role,
    });
  } else {
    io.emit(event, eventData);
    logger.info(socketConstants.SUCCESS_MESSAGES.BROADCAST_SENT, {
      event,
      userId: data?.userId,
      role: data?.role,
    });
  }

  // Log audit action if specified
  if (data?.auditAction && socketConstants.SOCKET_AUDIT_ACTIONS[data.auditAction]) {
    const audit = socketConstants.SOCKET_AUDIT_ACTIONS[data.auditAction];
    logger.logSecurityEvent(audit.description, {
      type: audit.type,
      userId: data.userId,
      role: data.role,
      details: data.details,
      event,
      room,
    });
  }
});

module.exports = { emit };