'use strict';

/**
 * Branch Profile Socket Events
 * Defines socket event constants for branch profile operations, ensuring consistency
 * across admin and merchant notifications.
 */

module.exports = {
  BRANCH_CREATED: 'merchant:branch:created',
  BRANCH_UPDATED: 'merchant:branch:updated',
  GEOFENCE_UPDATED: 'merchant:branch:geofence_updated',
  OPERATING_HOURS_UPDATED: 'merchant:branch:operating_hours_updated',
  MEDIA_UPDATED: 'merchant:branch:media_uploaded',
};