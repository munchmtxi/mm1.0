'use strict';

/**
 * Admin Profile Socket Handler
 * Manages real-time events for admin profile operations under the /admin/profile namespace.
 * Uses JWT authentication and role-based access control.
 */

const adminProfileService = require('@services/admin/profile/adminProfileService');
const localization = require('@utils/localization/localization');
const adminCoreConstants = require('@constants/admin/adminCoreConstants');
const adminEngagementConstants = require('@constants/admin/adminEngagementConstants');
const authConstants = require('@constants/common/authConstants');

/**
 * Sets up Socket.IO event handlers for admin profile operations.
 * @param {Object} io - Socket.IO server instance.
 */
function setupAdminProfileHandler(io) {
  const adminProfileNamespace = io.of('/admin/profile');

  adminProfileNamespace.use(authenticateSocket);
  adminProfileNamespace.use(restrictSocketTo(['SUPER_ADMIN', 'ADMIN']));

  adminProfileNamespace.on('connection', (socket) => {
    const adminId = socket.user.id;

    // Join admin-specific room
    socket.join(`admin:${adminId}`);

    // Handle profile update event
    socket.on('admin:profile:update', async (data, callback) => {
      try {
        const updateData = { ...data, ipAddress: socket.handshake.address };
        const adminRecord = await adminProfileService.updateAdminProfile(adminId, updateData);
        callback({
          status: 'success',
          data: { admin: adminRecord },
          message: localization.formatMessage(
            'admin', 'profile',
            adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'profile_updated_message',
          ),
        });
      } catch (error) {
        callback({
          status: 'error',
          message: localization.formatMessage(
            'admin', 'profile',
            adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'error_message',
            { error: error.message },
          ),
        });
      }
    });

    // Handle points award event
    socket.on('admin:profile:award_points', async (data, callback) => {
      try {
        const { action, points, languageCode } = data;
        const pointsRecord = await adminProfileService.awardAdminPoints(adminId, action, points, languageCode);
        callback({
          status: 'success',
          data: { points: pointsRecord },
          message: localization.formatMessage(
            'admin', 'profile',
            languageCode || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'points_awarded_message',
            { points },
          ),
        });
      } catch (error) {
        callback({
          status: 'error',
          message: localization.formatMessage(
            'admin', 'profile',
            adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'error_message',
            { error: error.message },
          ),
        });
      }
    });

    // Handle localization configuration event
    socket.on('admin:profile:configure_localization', async (data, callback) => {
      try {
        const localizationData = data;
        const adminRecord = await adminProfileService.configureLocalization(adminId, localizationData, socket.handshake.address);
        callback({
          status: 'success',
          data: { admin: adminRecord },
          message: localization.formatMessage(
            'admin', 'profile',
            adminRecord.language_code || adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'localization_updated_message',
          ),
        });
      } catch (error) {
        callback({
          status: 'error',
          message: localization.formatMessage(
            'admin', 'profile',
            adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'error_message',
            { error: error.message },
          ),
        });
      }
    });

    // Handle accessibility configuration event
    socket.on('admin:profile:manage_accessibility', async (data, callback) => {
      try {
        const accessibilityData = data;
        const accessibilityRecord = await adminProfileService.manageAccessibility(adminId, accessibilityData, socket.handshake.address);
        callback({
          status: 'success',
          data: { accessibility: accessibilityRecord },
          message: localization.formatMessage(
            'admin', 'profile',
            adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'accessibility_updated_message',
          ),
        });
      } catch (error) {
        callback({
          status: 'error',
          message: localization.formatMessage(
            'admin', 'profile',
            adminCoreConstants.ADMIN_SETTINGS.DEFAULT_LANGUAGE,
            'error_message',
            { error: error.message },
          ),
        });
      }
    });
  });
}

/**
 * Authenticates socket connection using JWT.
 * @param {Object} socket - Socket.IO socket instance.
 * @param {Function} next - Next middleware function.
 */
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = require('jsonwebtoken').verify(token, authConstants.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
}

/**
 * Restricts socket access to specified roles.
 * @param {string[]} allowedRoles - Array of allowed role names.
 * @returns {Function} Socket.IO middleware function.
 */
function restrictSocketTo(allowedRoles) {
  return (socket, next) => {
    if (!allowedRoles.includes(socket.user.role)) {
      return next(new Error('Authorization error: Insufficient permissions'));
    }
    next();
  };
}

module.exports = {
  setupAdminProfileHandler,
};