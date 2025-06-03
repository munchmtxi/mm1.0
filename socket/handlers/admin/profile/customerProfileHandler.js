'use strict';

/**
 * Customer Profile Socket Handler
 * Manages socket event listeners for customer profile operations, ensuring real-time updates
 * for admins and customers based on role-based access, aligned with admin and customer constants.
 */

const customerProfileEvents = require('@socket/events/admin/customerProfileEvents');
const logger = require('@utils/logger');
const { ADMIN_ROLES } = require('@constants/admin/adminCoreConstants');
const { NOTIFICATION_CONSTANTS } = require('@constants/customer/customerConstants');

const setupCustomerProfileHandlers = (io, socket) => {
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
  socket.on(customerProfileEvents.PROFILE_CREATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.PROFILE_CREATED, data, userId);
    }
    emitToAdmins(customerProfileEvents.PROFILE_CREATED, {
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
  socket.on(customerProfileEvents.PROFILE_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.PROFILE_UPDATED, data, userId);
    }
    emitToAdmins(customerProfileEvents.PROFILE_UPDATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles country update events.
   */
  socket.on(customerProfileEvents.COUNTRY_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.COUNTRY_UPDATED, data, userId);
    }
    emitToAdmins(customerProfileEvents.COUNTRY_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles language update events.
   */
  socket.on(customerProfileEvents.LANGUAGE_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.LANGUAGE_UPDATED, data, userId);
    }
    emitToAdmins(customerProfileEvents.LANGUAGE_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles dietary preferences update events.
   */
  socket.on(customerProfileEvents.DIETARY_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.DIETARY_UPDATED, data, userId);
    }
    emitToAdmins(customerProfileEvents.DIETARY_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles points awarded events.
   */
  socket.on(customerProfileEvents.POINTS_AWARDED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.POINTS_AWARDED, data, userId);
    }
    emitToAdmins(customerProfileEvents.POINTS_AWARDED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles wallet settings update events.
   */
  socket.on(customerProfileEvents.WALLET_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.WALLET_UPDATED, data, userId);
    }
    emitToAdmins(customerProfileEvents.WALLET_UPDATED, {
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
  socket.on(customerProfileEvents.PAYMENT_METHOD_ADDED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.PAYMENT_METHOD_ADDED, data, userId);
    }
    emitToAdmins(customerProfileEvents.PAYMENT_METHOD_ADDED, {
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
  socket.on(customerProfileEvents.WITHDRAWAL_PROCESSED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'customer') {
      emitToUser(customerProfileEvents.WITHDRAWAL_PROCESSED, data, userId);
    }
    emitToAdmins(customerProfileEvents.WITHDRAWAL_PROCESSED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  logger.info('Customer profile socket handlers initialized', { socketId: socket.id });
};

module.exports = {
  setupCustomerProfileHandlers,
};