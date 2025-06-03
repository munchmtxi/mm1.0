'use strict';

/**
 * payoutEvents.js
 * Constants for payout events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Payout event types for notifications and socket events
  EVENT_TYPES: {
    SETTINGS_CONFIGURED: 'payout:settingsConfigured',
    PAYOUT_PROCESSED: 'payout:processed',
    METHOD_VERIFIED: 'payout:methodVerified',
  },

  // Audit log action types for payout operations
  AUDIT_TYPES: {
    CONFIGURE_PAYOUT_SETTINGS: 'configure_payout_settings',
    PROCESS_PAYOUT: 'process_payout',
    VERIFY_PAYOUT_METHOD: 'verify_payout_method',
    GET_PAYOUT_HISTORY: 'get_payout_history',
  },

  // Notification types for payout events
  NOTIFICATION_TYPES: {
    PAYOUT_SETTINGS_UPDATED: 'payout_settings_updated',
    PAYOUT_RECEIVED: 'payout_received',
    PAYOUT_METHOD_VERIFIED: 'payout_method_verified',
  },

  // Settings for payout operations
  PAYOUT_SETTINGS: {
    SUPPORTED_SCHEDULES: ['daily', 'weekly', 'monthly'],
    SUPPORTED_METHODS: ['bank_transfer', 'mobile_money'],
    DEFAULT_CURRENCY: 'MWK',
    NOTIFICATION_RATE_LIMIT: 5, // Max notifications per hour
    DEFAULT_LANGUAGE: 'en',
  },

  // Error codes for payout operations
  ERROR_CODES: {
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    INVALID_RECIPIENT: 'INVALID_RECIPIENT',
    INVALID_SCHEDULE: 'INVALID_SCHEDULE',
    INVALID_METHOD: 'INVALID_METHOD',
    INVALID_ACCOUNT_DETAILS: 'INVALID_ACCOUNT_DETAILS',
  },
};