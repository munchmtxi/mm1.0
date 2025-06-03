'use strict';

/**
 * orderEvents.js
 * Constants for order events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Order event types for notifications and socket events
  EVENT_TYPES: {
    ORDER_PROCESSED: 'order:processed',
    STATUS_UPDATED: 'order:statusUpdated',
    PAYMENT_PROCESSED: 'order:paymentProcessed',
    POINTS_AWARDED: 'gamification:pointsAwarded',
  },

  // Audit log action types for order operations
  AUDIT_TYPES: {
    PROCESS_ORDER: 'process_order',
    APPLY_DIETARY_PREFERENCES: 'apply_dietary_preferences',
    UPDATE_ORDER_STATUS: 'update_order_status',
    PAY_ORDER_WITH_WALLET: 'pay_order_with_wallet',
  },

  // Notification types for order events
  NOTIFICATION_TYPES: {
    ORDER_CONFIRMATION: 'order_confirmation',
    ORDER_STATUS_UPDATE: 'order_status_update',
    PAYMENT_CONFIRMATION: 'payment_confirmation',
  },

  // Settings for order operations
  ORDER_SETTINGS: {
    SUPPORTED_ORDER_TYPES: ['dine-in', 'takeaway', 'delivery'],
    SUPPORTED_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'],
    NOTIFICATION_RATE_LIMIT: 10, // Max notifications per hour per customer
    DEFAULT_CURRENCY: 'MWK',
    DEFAULT_LANGUAGE: 'en',
  },

  // Error codes for order operations
  ERROR_CODES: {
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    ITEM_UNAVAILABLE: 'ITEM_UNAVAILABLE',
    INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
    ORDER_ALREADY_PROCESSED: 'ORDER_ALREADY_PROCESSED',
    ORDER_ALREADY_PAID: 'ORDER_ALREADY_PAID',
    CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
    INVALID_STATUS: 'INVALID_STATUS',
  },
};