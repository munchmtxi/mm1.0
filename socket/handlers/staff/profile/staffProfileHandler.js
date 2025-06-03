'use strict';

/**
 * Staff Profile Handler
 * Handles WebSocket events for staff profile operations, including profile updates,
 * compliance verification, and profile retrieval. Integrates with staffProfileService
 * for business logic and socketService for real-time communication.
 *
 * Last Updated: May 16, 2025
 */

const staffProfileService = require('@services/staff/profile/staffProfileService');
const socketService = require('@services/common/socketService');
const staffProfileEvents = require('@socket/events/staff/profile/staffProfileEvents');
const logger = require('@utils/logger');
const { STAFF_ERROR_CODES } = require('@constants/staff/staffSystemConstants');
const { STAFF_TYPES } = require('@constants/staff/staffRolesConstants');
const AppError = require('@utils/AppError');

/**
 * Registers WebSocket event handlers for staff profile operations.
 * @param {Object} io - Socket.IO server instance.
 */
const registerStaffProfileHandlers = (io) => {
  io.on('connection', (socket) => {
    logger.info('New WebSocket connection established', { socketId: socket.id });

    // Join staff-specific room
    socket.on('join:staff', ({ staffId, userId }) => {
      if (!staffId || !userId) {
        logger.warn('Invalid staffId or userId for joining staff room', { staffId, userId });
        socket.emit(staffProfileEvents.ERROR, {
          message: 'Invalid staffId or userId',
          code: STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        });
        return;
      }

      const room = `staff:${userId}`;
      socket.join(room);
      logger.info('Staff joined room', { staffId, userId, room });
    });

    // Handle profile update
    socket.on(staffProfileEvents.UPDATE_PROFILE, async ({ staffId, userId, details }) => {
      try {
        if (!staffId || !userId) {
          throw new AppError(
            'Missing staffId or userId',
            400,
            STAFF_ERROR_CODES.STAFF_NOT_FOUND
          );
        }
        const auditContext = {
          actorId: userId,
          actorRole: STAFF_TYPES.STAFF, // Default role, adjust based on actual user role
          ipAddress: socket.handshake.address,
        };
        const updatedStaff = await staffProfileService.updateStaffDetails(staffId, details, auditContext);
        await socketService.emitToRoom(
          `staff:${userId}`,
          staffProfileEvents.PROFILE_UPDATED,
          { userId, staffId, updatedFields: updatedStaff }
        );
        logger.info('Profile update event processed', { staffId, userId });
      } catch (error) {
        logger.error('Error handling profile update', { error: error.message, staffId });
        socket.emit(staffProfileEvents.ERROR, {
          message: error.message,
          code: error.errorCode || STAFF_ERROR_CODES.COMPLIANCE_VIOLATION,
        });
      }
    });

    // Handle compliance verification
    socket.on(staffProfileEvents.VERIFY_COMPLIANCE, async ({ staffId, userId }) => {
      try {
        if (!staffId || !userId) {
          throw new AppError(
            'Missing staffId or userId',
            400,
            STAFF_ERROR_CODES.STAFF_NOT_FOUND
          );
        }
        const auditContext = {
          actorId: userId,
          actorRole: STAFF_TYPES.MANAGER, // Assume manager for compliance verification
          ipAddress: socket.handshake.address,
        };
        const complianceStatus = await staffProfileService.verifyCompliance(staffId, auditContext);
        await socketService.emitToRoom(
          `staff:${userId}`,
          staffProfileEvents.COMPLIANCE_VERIFIED,
          { userId, staffId, complianceStatus }
        );
        logger.info('Compliance verification event processed', { staffId, userId });
      } catch (error) {
        logger.error('Error handling compliance verification', { error: error.message, staffId });
        socket.emit(staffProfileEvents.ERROR, {
          message: error.message,
          code: error.errorCode || STAFF_ERROR_CODES.COMPLIANCE_VIOLATION,
        });
      }
    });

    // Handle profile retrieval
    socket.on(staffProfileEvents.GET_PROFILE, async ({ staffId, userId }) => {
      try {
        if (!staffId || !userId) {
          throw new AppError(
            'Missing staffId or userId',
            400,
            STAFF_ERROR_CODES.STAFF_NOT_FOUND
          );
        }
        const auditContext = {
          actorId: userId,
          actorRole: STAFF_TYPES.STAFF, // Default role, adjust based on actual user role
          ipAddress: socket.handshake.address,
        };
        const staffProfile = await staffProfileService.getStaffProfile(staffId, auditContext);
        await socketService.emitToRoom(
          `staff:${userId}`,
          staffProfileEvents.PROFILE_RETRIEVED,
          { userId, staffId, staffProfile }
        );
        logger.info('Profile retrieval event processed', { staffId, userId });
      } catch (error) {
        logger.error('Error handling profile retrieval', { error: error.message, staffId });
        socket.emit(staffProfileEvents.ERROR, {
          message: error.message,
          code: error.errorCode || STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        });
      }
    });
  });
};

module.exports = { registerStaffProfileHandlers };