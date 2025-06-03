/**
 * socketConstants.js
 *
 * Defines constants for the Socket Service, covering event types and audit actions
 * for all roles (admin, customer, driver, merchant, staff). Supports cross-vertical
 * integration (mtables, munch, mtxi, mevents) and global operations. Aligns with
 * notificationConstants.js, adminCoreConstants.js, staffConstants.js, merchantConstants.js,
 * driverConstants.js, and customerConstants.js.
 *
 * Last Updated: May 28, 2025
 */

'use strict';

module.exports = {
  // Socket Event Types
  SOCKET_EVENT_TYPES: {
    // Common Events
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ERROR: 'error',

    // Admin Events
    ADMIN_USER_UPDATED: 'admin_user_updated',
    ADMIN_CONFIG_CHANGED: 'admin_config_changed',
    ADMIN_ANALYTICS_UPDATED: 'admin_analytics_updated',

    // Customer Events
    CUSTOMER_BOOKING_UPDATE: 'booking_update',
    CUSTOMER_ORDER_UPDATE: 'order_update',
    CUSTOMER_RIDE_UPDATE: 'ride_update',
    CUSTOMER_EVENT_UPDATE: 'event_update',
    CUSTOMER_WALLET_UPDATE: 'wallet_update',
    CUSTOMER_PROMOTION: 'promotion',
    CUSTOMER_FRIEND_REQUEST: 'friend_request',
    CUSTOMER_EVENT_INVITE: 'event_invite',

    // Driver Events
    DRIVER_RIDE_REQUEST: 'ride_request',
    DRIVER_DELIVERY_REQUEST: 'delivery_request',
    DRIVER_PAYMENT_CONFIRMED: 'payment_confirmation',
    DRIVER_TIP_RECEIVED: 'tip_received',
    DRIVER_SAFETY_ALERT: 'safety_alert',
    DRIVER_HIGH_DEMAND: 'high_demand',
    DRIVER_SCHEDULE_UPDATE: 'schedule_update',

    // Merchant Events
    MERCHANT_BOOKING_CONFIRMED: 'booking_confirmed',
    MERCHANT_ORDER_RECEIVED: 'order_received',
    MERCHANT_EVENT_CREATED: 'event_created',
    MERCHANT_PAYOUT_PROCESSED: 'payout_processed',
    MERCHANT_INVENTORY_ALERT: 'inventory_alert',

    // Staff Events
    STAFF_TASK_ASSIGNED: 'task_assignment',
    STAFF_SHIFT_UPDATED: 'shift_update',
    STAFF_WALLET_UPDATED: 'wallet_update',
    STAFF_TRAINING_REMINDER: 'training_reminder',
    STAFF_DELIVERY_ASSIGNED: 'delivery_assignment',
    STAFF_ANNOUNCEMENT: 'announcement'
  },

  // Audit Log Actions for Socket Events
  SOCKET_AUDIT_ACTIONS: {
    USER_LOGIN: { type: 'user_login', description: 'User logged in via socket' },
    USER_LOGOUT: { type: 'user_logout', description: 'User logged out via socket' },
    PROFILE_UPDATED: { type: 'profile_updated', description: 'User profile updated' },
    NOTIFICATION_SENT: { type: 'notification_sent', description: 'Socket notification sent' },
    TASK_ASSIGNED: { type: 'task_assigned', description: 'Task assigned to staff/driver' },
    CONFIG_CHANGED: { type: 'config_changed', description: 'Platform configuration changed' },
    ANALYTICS_UPDATED: { type: 'analytics_updated', description: 'Analytics data updated' },
    PAYMENT_PROCESSED: { type: 'payment_processed', description: 'Payment processed via socket' },
    DELIVERY_ASSIGNED: { type: 'delivery_assigned', description: 'Delivery assigned to driver/staff' }
  },

  // Socket Settings
  SOCKET_SETTINGS: {
    HEARTBEAT_INTERVAL_SECONDS: 30,
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_INTERVAL_SECONDS: 10,
    MAX_EVENT_PAYLOAD_SIZE_MB: 1,
    AUDIT_LOG_RETENTION_DAYS: 180
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_EVENT: 'ERR_INVALID_SOCKET_EVENT',
    INVALID_ROOM: 'ERR_INVALID_SOCKET_ROOM',
    SOCKET_DISCONNECTED: 'ERR_SOCKET_DISCONNECTED',
    PAYLOAD_TOO_LARGE: 'ERR_PAYLOAD_TOO_LARGE',
    RATE_LIMIT_EXCEEDED: 'ERR_SOCKET_RATE_LIMIT_EXCEEDED'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    EVENT_EMITTED: 'Socket event emitted successfully',
    BROADCAST_SENT: 'Socket broadcast sent successfully'
  }
};