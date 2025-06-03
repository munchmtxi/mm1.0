'use strict';

/**
 * Driver Profile Socket Handler
 * Manages socket event listeners for driver profile operations, ensuring real-time updates
 * for admins and drivers based on role-based access, aligned with admin and driver constants.
 */

const driverProfileEvents = require('@socket/events/admin/driverProfileEvents');
const logger = require('@utils/logger');
const { ADMIN_ROLES } = require('@constants/admin/adminCoreConstants');
const { NOTIFICATION_CONSTANTS } = require('@constants/driver/driverConstants');

const setupDriverProfileHandlers = (io, socket) => {
  /**
   * Emits an event to a specific user.
   * @param {string} event - The event name.
   * @param {Object} data - The event data.
   * @param {string} userId - The target user ID.
   */
  const emitToUser = (event, data, userId) => {
    socket.to(`user:${userId}`).emit(event, data);
    logger.info(`Emitted ${event} to user:${userId}`, { data });
  };

  /**
   * Emits an event to all admins.
   * @param {string} event - The event name.
   * @param {Object} data - The event data.
   */
  const emitToAdmins = (event, data) => {
    socket.to('role:admin').emit(event, data);
    logger.info(`Emitted ${event} to role:admin`, { data });
  };

  /**
   * Handles profile creation events.
   */
  socket.on(driverProfileEvents.PROFILE_CREATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.PROFILE_CREATED, data, userId);
    }
    emitToAdmins(driverProfileEvents.PROFILE_CREATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles profile update events.
   */
  socket.on(driverProfileEvents.PROFILE_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.PROFILE_UPDATED, data, userId);
    }
    emitToAdmins(driverProfileEvents.PROFILE_UPDATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles certification upload events.
   */
  socket.on(driverProfileEvents.CERTIFICATION_UPLOADED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.CERTIFICATION_UPLOADED, data, userId);
    }
    emitToAdmins(driverProfileEvents.CERTIFICATION_UPLOADED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles profile verification events.
   */
  socket.on(driverProfileEvents.PROFILE_VERIFIED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.PROFILE_VERIFIED, data, userId);
    }
    emitToAdmins(driverProfileEvents.PROFILE_VERIFIED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles country update events.
   */
  socket.on(driverProfileEvents.COUNTRY_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.COUNTRY_UPDATED, data, userId);
    }
    emitToAdmins(driverProfileEvents.COUNTRY_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles wallet settings update events.
   */
  socket.on(driverProfileEvents.WALLET_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.WALLET_UPDATED, data, userId);
    }
    emitToAdmins(driverProfileEvents.WALLET_UPDATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles payment method added events.
   */
  socket.on(driverProfileEvents.PAYMENT_METHOD_ADDED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.PAYMENT_METHOD_ADDED, data, userId);
    }
    emitToAdmins(driverProfileEvents.PAYMENT_METHOD_ADDED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles withdrawal processed events.
   */
  socket.on(driverProfileEvents.WITHDRAWAL_PROCESSED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'driver') {
      emitToUser(driverProfileEvents.WITHDRAWAL_PROCESSED, data, userId);
    }
    emitToAdmins(driverProfileEvents.WITHDRAWAL_PROCESSED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  logger.info('Driver profile socket handlers initialized', { socketId: socket.id });
};

module.exports = {
  setupDriverProfileHandlers,
};