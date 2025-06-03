'use strict';

/**
 * CheckIn Events
 * Defines Socket.IO events for CheckIn service.
 * Last Updated: May 20, 2025
 */

module.exports = {
  CHECK_IN_PROCESSED: 'booking:checked_in',
  TABLE_STATUS_UPDATED: 'table:status_updated',
  POINTS_AWARDED: 'gamification:points_awarded',
  SUPPORT_REQUEST_RECEIVED: 'support:request_received',
};