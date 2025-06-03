'use strict';

/**
 * inventoryEvents.js
 * Constants for inventory events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Inventory event types for notifications and socket events
  EVENT_TYPES: {
    STOCK_LEVELS: 'inventory:stockLevels',
    INVENTORY_UPDATED: 'inventory:updated',
    RESTOCKING_ALERTS: 'inventory:restockingAlerts',
    POINTS_AWARDED: 'gamification:pointsAwarded',
  },

  // Audit log action types for inventory operations
  AUDIT_TYPES: {
    TRACK_STOCK_LEVELS: 'track_stock_levels',
    UPDATE_INVENTORY: 'update_inventory',
    SEND_RESTOCKING_ALERTS: 'send_restocking_alerts',
    TRACK_INVENTORY_GAMIFICATION: 'track_inventory_gamification',
  },

  // Notification types for inventory events
  NOTIFICATION_TYPES: {
    RESTOCKING_ALERT: 'restocking_alert',
  },

  // Settings for inventory operations
  INVENTORY_SETTINGS: {
    LOW_STOCK_THRESHOLD: 0, // Quantity <= minimum_stock_level
    NOTIFICATION_RATE_LIMIT: 5, // Max restocking alerts per hour
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_STATUSES: ['in-stock', 'out-of-stock', 'pre-order'],
  },

  // Error codes for inventory operations
  ERROR_CODES: {
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    NO_BOH_STAFF: 'NO_BOH_STAFF',
    INVALID_STAFF: 'INVALID_STAFF',
  },
};