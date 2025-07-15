'use strict';

/**
 * socketService.js
 *
 * Centralized service for managing Socket.IO events across admin, customer, driver, merchant, and staff roles.
 * Handles event emission, validation, audit logging, and error handling for mtables, munch, mtxi, and mevents services.
 * Integrates with Redis adapter and role-specific rooms for scalable real-time communication.
 *
 * Dependencies:
 * - socketConstants.js (event types, audit actions, settings)
 * - localizationConstants.js (localized error messages)
 * - logger.js (custom logging)
 * - catchAsyncSocket.js (async error handling)
 *
 * Last Updated: June 25, 2025
 */

const logger = require('@utils/logger');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const catchAsyncSocket = require('@utils/catchAsyncSocket');

/**
 * Emits a socket event to a specific room or all connected clients.
 * @param {Object} io - Socket.IO instance.
 * @param {string} event - Event name (e.g., CUSTOMER_ORDER_UPDATE, GAMIFICATION_POINTS_AWARDED).
 * @param {Object} data - Event data (must include userId, role for audit).
 * @param {string} [room=null] - Target room (e.g., customer:123, staff:merchant_456:789).
 * @param {string} [languageCode] - Language code for localized error messages.
 */
const emit = catchAsyncSocket(async (io, event, data, room = null, languageCode = localizationConstants.DEFAULT_LANGUAGE) => {
  if (!io) {
    logger.error('Socket.IO instance missing', { event });
    throw new Error(`${socketConstants.ERROR_CODES.SOCKET_DISCONNECTED}: ${localizationConstants.getMessage('socket.io_instance_required', languageCode)}`);
  }
  if (!event || typeof event !== 'string' || !socketConstants.SOCKET_EVENT_TYPES[event.toUpperCase()]) {
    logger.warn('Invalid socket event', { event });
    throw new Error(`${socketConstants.ERROR_CODES.INVALID_EVENT}: ${localizationConstants.getMessage('socket.invalid_event', languageCode, { event })}`);
  }
  if (room && typeof room !== 'string') {
    logger.warn('Invalid room name', { room, event });
    throw new Error(`${socketConstants.ERROR_CODES.INVALID_ROOM}: ${localizationConstants.getMessage('socket.invalid_room', languageCode)}`);
  }
  if (!data || !data.userId || !data.role) {
    logger.warn('Missing required data fields', { event, userId: data?.userId, role: data?.role });
    throw new Error(`${socketConstants.ERROR_CODES.INVALID_EVENT}: ${localizationConstants.getMessage('socket.missing_data', languageCode)}`);
  }
  if (data && JSON.stringify(data).length > socketConstants.SOCKET_SETTINGS.MAX_EVENT_PAYLOAD_SIZE_MB * 1024 * 1024) {
    logger.warn('Payload size exceeds limit', { event, size: JSON.stringify(data).length });
    throw new Error(`${socketConstants.ERROR_CODES.PAYLOAD_TOO_LARGE}: ${localizationConstants.getMessage('socket.payload_too_large', languageCode, { max: socketConstants.SOCKET_SETTINGS.MAX_EVENT_PAYLOAD_SIZE_MB })}`);
  }

  const validRoles = ['admin', 'customer', 'driver', 'merchant', 'staff'];
  if (!validRoles.includes(data.role)) {
    logger.warn('Invalid role in event data', { event, role: data.role });
    throw new Error(`${socketConstants.ERROR_CODES.INVALID_EVENT}: ${localizationConstants.getMessage('socket.invalid_role', languageCode, { role: data.role })}`);
  }

  const eventData = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  // Emit to room or broadcast
  if (room) {
    io.to(room).emit(event, eventData);
    logger.info(socketConstants.SUCCESS_MESSAGES.EVENT_EMITTED, {
      event,
      room,
      userId: data.userId,
      role: data.role,
    });
  } else {
    io.emit(event, eventData);
    logger.info(socketConstants.SUCCESS_MESSAGES.BROADCAST_SENT, {
      event,
      userId: data.userId,
      role: data.role,
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