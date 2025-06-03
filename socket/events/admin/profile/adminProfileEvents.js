'use strict';

/**
 * Socket.IO Events for Admin Profile
 * Defines event names for real-time admin profile operations.
 */

const adminProfileEvents = {
  PROFILE_UPDATED: 'admin:profile:updated',
  PERMISSIONS_UPDATED: 'admin:profile:permissions_updated',
  ACCOUNT_SUSPENDED: 'admin:profile:suspended',
  ACCOUNT_DELETED: 'admin:profile:deleted',
  POINTS_AWARDED: 'admin:profile:points_awarded',
  LOCALIZATION_UPDATED: 'admin:profile:localization_updated',
  ACCESSIBILITY_UPDATED: 'admin:profile:accessibility_updated',
  NOTIFICATION: 'admin:profile:notification',
};

module.exports = adminProfileEvents;