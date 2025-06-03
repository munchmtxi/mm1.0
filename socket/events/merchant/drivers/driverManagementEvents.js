// src/events.js
'use strict';

/**
 * Driver Event Constants
 * Event constants for driver-related actions in Munch merchant service.
 * Last Updated: May 22, 2025
 */

const { EventEmitter } = require('events');

module.exports = {
  EVENT_TYPES: {
    DELIVERY_TASK_ASSIGNED: 'driver:deliveryTaskAssigned',
    COMPLIANCE_CHECK: 'driver:complianceCheck',
    GAMIFICATION_POINTS_AWARDED: 'driver:pointsAwarded',
    DRIVER_LOCATION_UPDATED: 'driver:locationUpdated',
  },

  NOTIFICATION_TYPES: {
    DELIVERY_TASK_ASSIGNED: 'delivery_task_assigned',
    COMPLIANCE_CHECK_PASSED: 'compliance_check_passed',
    COMPLIANCE_CHECK_FAILED: 'compliance_check_failed',
    GAMIFICATION_POINTS_AWARDED: 'points_awarded',
    DRIVER_LOCATION_UPDATED: 'location_updated',
  },

  AUDIT_TYPES: {
    DELIVERY_ASSIGNED: 'delivery_assigned',
    COMPLIANCE_CHECK_PASSED: 'compliance_check_passed',
    COMPLIANCE_CHECK_FAILED: 'compliance_check_failed',
    GAMIFICATION_POINTS_AWARDED: 'gamification_points_awarded',
    DRIVER_LOCATION_UPDATED: 'location_updated',
  },

  SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
  },

  ERROR_CODES: {
    DRIVER_NOT_FOUND: 'DRIVER_NOT_FOUND',
    EVENT_PROCESSING_FAILED: 'EVENT_PROCESSING_FAILED',
  },

  DriverEventEmitter: class DriverEventEmitter extends EventEmitter {
    constructor() {
      super();
    }
  }
};