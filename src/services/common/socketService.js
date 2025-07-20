'use strict';

/**
 * socketService.js
 *
 * Centralized service for managing Socket.IO events for munch, mtxi, mtickets, mtables, mstays, mpark, and mevents.
 * Validates events against product-specific constants and handles role-specific rooms.
 *
 * Dependencies:
 * - socket/events/index.js (role-specific events)
 * - socket/rooms/index.js (room utilities)
 * - constants/common/*Constants.js (product-specific constants)
 * - localizationConstants.js (localized error messages)
 * - logger.js (custom logging)
 * - catchAsyncSocket.js (async error handling)
 *
 * Last Updated: July 19, 2025
 */

const logger = require('@utils/logger');
const localizationConstants = require('@constants/common/localizationConstants');
const catchAsyncSocket = require('@utils/catchAsyncSocket');
const eventTypes = require('@socket/events');
const roomUtils = require('@socket/rooms');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mticketsConstants = require('@constants/common/mticketsConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mstaysConstants = require('@constants/common/mstaysConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const meventsConstants = require('@constants/common/meventsConstants');

/**
 * Emits a socket event to a specific room or all connected clients.
 * @param {Object} io - Socket.IO instance.
 * @param {string} event - Event name (e.g., ORDER_CONFIRMATION, RIDE_REQUESTED).
 * @param {Object} data - Event data (must include userId, role, service).
 * @param {string} [room=null] - Target room (e.g., mm:merchant-123, mm:role:admin).
 * @param {string} [languageCode] - Language code for localized error messages.
 */
const emit = catchAsyncSocket(async (io, event, data, room = null, languageCode = localizationConstants.DEFAULT_LANGUAGE) => {
  if (!io) {
    logger.error('Socket.IO instance missing', { event });
    throw new Error(`SOCKET_DISCONNECTED: ${localizationConstants.getMessage('socket.io_instance_required', languageCode)}`);
  }
  if (!event || typeof event !== 'string') {
    logger.warn('Invalid socket event', { event });
    throw new Error(`INVALID_EVENT: ${localizationConstants.getMessage('socket.invalid_event', languageCode, { event })}`);
  }
  if (room && typeof room !== 'string') {
    logger.warn('Invalid room name', { room, event });
    throw new Error(`INVALID_ROOM: ${localizationConstants.getMessage('socket.invalid_room', languageCode)}`);
  }
  if (!data || !data.userId || !data.role || !data.service) {
    logger.warn('Missing required data fields', { event, userId: data?.userId, role: data?.role, service: data?.service });
    throw new Error(`INVALID_EVENT: ${localizationConstants.getMessage('socket.missing_data', languageCode)}`);
  }
  if (data && JSON.stringify(data).length > 5 * 1024 * 1024) { // 5MB limit
    logger.warn('Payload size exceeds limit', { event, size: JSON.stringify(data).length });
    throw new Error(`PAYLOAD_TOO_LARGE: ${localizationConstants.getMessage('socket.payload_too_large', languageCode, { max: 5 })}`);
  }

  const validRoles = ['admin', 'customer', 'driver', 'merchant', 'staff'];
  if (!validRoles.includes(data.role)) {
    logger.warn('Invalid role in event data', { event, role: data.role });
    throw new Error(`INVALID_EVENT: ${localizationConstants.getMessage('socket.invalid_role', languageCode, { role: data.role })}`);
  }

  const validServices = ['munch', 'mtxi', 'mtickets', 'mtables', 'mstays', 'mpark', 'mevents'];
  if (!validServices.includes(data.service)) {
    logger.warn('Invalid service in event data', { event, service: data.service });
    throw new Error(`INVALID_EVENT: ${localizationConstants.getMessage('socket.invalid_service', languageCode, { service: data.service })}`);
  }

  // Validate event against service-specific constants or role-specific events
  const serviceConstants = {
    munch: munchConstants,
    mtxi: mtxiConstants,
    mtickets: mticketsConstants,
    mtables: mtablesConstants,
    mstays: mstaysConstants,
    mpark: mparkConstants,
    mevents: meventsConstants
  };
  const constants = serviceConstants[data.service];
  if (!constants.NOTIFICATION_TYPES[event] && !constants.AUDIT_TYPES[event] && !eventTypes[data.role]?.[event] && !eventTypes.common?.[event]) {
    logger.warn('Event not supported', { event, service: data.service, role: data.role });
    throw new Error(`INVALID_EVENT: ${localizationConstants.getMessage('socket.invalid_event_for_service', languageCode, { event, service: data.service })}`);
  }

  // Validate room
  if (room && !roomUtils.validateRoom(room, data.role, data.service)) {
    logger.warn('Invalid or unauthorized room', { room, role: data.role, service: data.service, event });
    throw new Error(`INVALID_ROOM: ${localizationConstants.getMessage('socket.invalid_room', languageCode)}`);
  }

  const eventData = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  // Emit to room or broadcast
  if (room) {
    io.to(room).emit(event, eventData);
    logger.info('Event emitted to room', { event, room, userId: data.userId, role: data.role, service: data.service });
  } else {
    io.emit(event, eventData);
    logger.info('Event broadcasted', { event, userId: data.userId, role: data.role, service: data.service });
  }

  // Log audit action
  if (data?.auditAction && constants.AUDIT_TYPES[data.auditAction]) {
    logger.logSecurityEvent('Socket event audit', {
      type: data.auditAction,
      userId: data.userId,
      role: data.role,
      service: data.service,
      details: data.details,
      event,
      room,
    });
  }
});

module.exports = { emit };