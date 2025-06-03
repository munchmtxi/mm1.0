'use strict';

/**
 * Merchant Profile Socket Handler
 * Manages socket event listeners for merchant profile operations, ensuring real-time updates
 * for admins and merchants based on role-based access, aligned with admin and merchant constants.
 */

const merchantProfileEvents = require('@socket/events/admin/merchantProfileEvents');
const logger = require('@utils/logger');
const { ADMIN_ROLES } = require('@constants/admin/adminCoreConstants');
const { NOTIFICATION_CONSTANTS } = require('@constants/merchant/merchantConstants');

const setupMerchantProfileHandlers = (io, socket) => {
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
  socket.on(merchantProfileEvents.PROFILE_CREATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.PROFILE_CREATED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.PROFILE_CREATED, {
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
  socket.on(merchantProfileEvents.PROFILE_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.PROFILE_UPDATED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.PROFILE_UPDATED, {
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
  socket.on(merchantProfileEvents.COUNTRY_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.COUNTRY_UPDATED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.COUNTRY_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles branch settings update events.
   */
  socket.on(merchantProfileEvents.BRANCH_SETTINGS_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.BRANCH_SETTINGS_UPDATED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.BRANCH_SETTINGS_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles media upload events.
   */
  socket.on(merchantProfileEvents.MEDIA_UPLOADED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.MEDIA_UPLOADED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.MEDIA_UPLOADED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles wallet settings update events.
   */
  socket.on(merchantProfileEvents.WALLET_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.WALLET_UPDATED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.WALLET_UPDATED, {
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
  socket.on(merchantProfileEvents.PAYMENT_METHOD_ADDED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.PAYMENT_METHOD_ADDED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.PAYMENT_METHOD_ADDED, {
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
  socket.on(merchantProfileEvents.WITHDRAWAL_PROCESSED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(merchantProfileEvents.WITHDRAWAL_PROCESSED, data, userId);
    }
    emitToAdmins(merchantProfileEvents.WITHDRAWAL_PROCESSED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  logger.info('Merchant profile socket handlers initialized', { socketId: socket.id });
};

module.exports = {
  setupMerchantProfileHandlers,
};