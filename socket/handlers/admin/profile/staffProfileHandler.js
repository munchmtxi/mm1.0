'use strict';

/**
 * Staff Profile Socket Handler
 * Manages socket event listeners for staff profile operations, ensuring real-time updates
 * for admins and staff based on role-based access, aligned with admin and staff constants.
 */

const staffProfileEvents = require('@socket/events/admin/staffProfileEvents');
const logger = require('@utils/logger');
const { ADMIN_ROLES } = require('@constants/admin/adminCoreConstants');
const { STAFF_NOTIFICATION_CONSTANTS } = require('@constants/staff/staffSystemConstants');

const setupStaffProfileHandlers = (io, socket) => {
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
  socket.on(staffProfileEvents.PROFILE_CREATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.PROFILE_CREATED, data, userId);
    }
    emitToAdmins(staffProfileEvents.PROFILE_CREATED, {
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
  socket.on(staffProfileEvents.PROFILE_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.PROFILE_UPDATED, data, userId);
    }
    emitToAdmins(staffProfileEvents.PROFILE_UPDATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles compliance verification events.
   */
  socket.on(staffProfileEvents.COMPLIANCE_VERIFIED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.COMPLIANCE_VERIFIED, data, userId);
    }
    emitToAdmins(staffProfileEvents.COMPLIANCE_VERIFIED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles country update events.
   */
  socket.on(staffProfileEvents.COUNTRY_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.COUNTRY_UPDATED, data, userId);
    }
    emitToAdmins(staffProfileEvents.COUNTRY_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles wallet settings update events.
   */
  socket.on(staffProfileEvents.WALLET_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.WALLET_UPDATED, data, userId);
    }
    emitToAdmins(staffProfileEvents.WALLET_UPDATED, {
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
  socket.on(staffProfileEvents.PAYMENT_METHOD_ADDED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.PAYMENT_METHOD_ADDED, data, userId);
    }
    emitToAdmins(staffProfileEvents.PAYMENT_METHOD_ADDED, {
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
  socket.on(staffProfileEvents.WITHDRAWAL_PROCESSED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'staff') {
      emitToUser(staffProfileEvents.WITHDRAWAL_PROCESSED, data, userId);
    }
    emitToAdmins(staffProfileEvents.WITHDRAWAL_PROCESSED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  logger.info('Staff profile socket handlers initialized', { socketId: socket.id });
};

module.exports = {
  setupStaffProfileHandlers,
};