'use strict';

/**
 * Branch Profile Socket Handler
 * Manages socket event listeners for branch profile operations, ensuring real-time updates
 * for admins and merchants based on role-based access, aligned with admin and merchant constants.
 */

const branchProfileEvents = require('@socket/events/admin/branchProfileEvents');
const logger = require('@utils/logger');
const { ADMIN_ROLES } = require('@constants/admin/adminCoreConstants');
const { NOTIFICATION_CONSTANTS } = require('@constants/merchant/merchantConstants');

const setupBranchProfileHandlers = (io, socket) => {
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
   * Handles branch creation events.
   */
  socket.on(branchProfileEvents.BRANCH_CREATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(branchProfileEvents.BRANCH_CREATED, data, userId);
    }
    emitToAdmins(branchProfileEvents.BRANCH_CREATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles branch update events.
   */
  socket.on(branchProfileEvents.BRANCH_UPDATED, (data) => {
    const { userId, role, message, details, logType } = data;
    if (role === 'merchant') {
      emitToUser(branchProfileEvents.BRANCH_UPDATED, data, userId);
    }
    emitToAdmins(branchProfileEvents.BRANCH_UPDATED, {
      userId,
      role,
      message,
      details,
      logType,
    });
  });

  /**
   * Handles geofence update events.
   */
  socket.on(branchProfileEvents.GEOFENCE_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'merchant') {
      emitToUser(branchProfileEvents.GEOFENCE_UPDATED, data, userId);
    }
    emitToAdmins(branchProfileEvents.GEOFENCE_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles operating hours update events.
   */
  socket.on(branchProfileEvents.OPERATING_HOURS_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'merchant') {
      emitToUser(branchProfileEvents.OPERATING_HOURS_UPDATED, data, userId);
    }
    emitToAdmins(branchProfileEvents.OPERATING_HOURS_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  /**
   * Handles media upload events.
   */
  socket.on(branchProfileEvents.MEDIA_UPDATED, (data) => {
    const { userId, role, message, details } = data;
    if (role === 'merchant') {
      emitToUser(branchProfileEvents.MEDIA_UPDATED, data, userId);
    }
    emitToAdmins(branchProfileEvents.MEDIA_UPDATED, {
      userId,
      role,
      message,
      details,
    });
  });

  logger.info('Branch profile socket handlers initialized', { socketId: socket.id });
};

module.exports = {
  setupBranchProfileHandlers,
};