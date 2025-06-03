'use strict';

/**
 * deliveryEvents.js
 * Constants for delivery events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Delivery event types for notifications and socket events
  EVENT_TYPES: {
    DELIVERY_ASSIGNED: 'delivery:assigned',
    STATUS_UPDATE: 'delivery:statusUpdate',
    DRIVER_MESSAGE: 'delivery:driverMessage',
    POINTS_AWARDED: 'gamification:pointsAwarded',
  },

  // Audit log action types for delivery operations
  AUDIT_TYPES: {
    ASSIGN_DELIVERY: 'assign_delivery',
    TRACK_DELIVERY_STATUS: 'track_delivery_status',
    COMMUNICATE_WITH_DRIVER: 'communicate_with_driver',
    LOG_DELIVERY_GAMIFICATION: 'log_delivery_gamification',
  },

  // Notification types for delivery events
  NOTIFICATION_TYPES: {
    DELIVERY_ASSIGNMENT: 'delivery_assignment',
    DRIVER_COMMUNICATION: 'driver_communication',
  },

  // Settings for delivery operations
  DELIVERY_SETTINGS: {
    MAX_DELIVERIES_PER_DRIVER: 5, // Max concurrent deliveries per driver
    NOTIFICATION_RATE_LIMIT: 10, // Max notifications per hour per driver
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_DELIVERY_STATUSES: ['out_for_delivery', 'completed', 'cancelled'],
  },

  // Error codes for delivery operations
  ERROR_CODES: {
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    DRIVER_UNAVAILABLE: 'DRIVER_UNAVAILABLE',
    INVALID_MESSAGE: 'INVALID_MESSAGE',
    NO_RECENT_DELIVERIES: 'NO_RECENT_DELIVERIES',
  },
};