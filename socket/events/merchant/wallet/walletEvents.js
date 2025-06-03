'use strict';

/**
 * walletEvents.js
 * Constants for wallet events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Wallet event types for notifications and socket events
  EVENT_TYPES: {
    WALLET_CREATED: 'wallet:created',
    PAYMENT_RECEIVED: 'wallet:paymentReceived',
    PAYOUT_DISBURSED: 'wallet:payoutDisbursed',
  },

  // Audit log action types for wallet operations
  AUDIT_TYPES: {
    CREATE_WALLET: 'create_wallet',
    RECEIVE_PAYMENT: 'receive_payment',
    DISBURSE_PAYOUT: 'disburse_payout',
    GET_WALLET_BALANCE: 'get_wallet_balance',
    GET_TRANSACTION_HISTORY: 'get_transaction_history',
  },

  // Notification types for wallet events
  NOTIFICATION_TYPES: {
    WALLET_CREATED: 'wallet_created',
    PAYMENT_RECEIVED: 'payment_received',
    PAYOUT_RECEIVED: 'payout_received',
  },

  // Settings for wallet operations
  WALLET_SETTINGS: {
    DEFAULT_CURRENCY: 'MWK',
    SUPPORTED_CURRENCIES: ['MWK', 'USD'],
    MIN_BALANCE: 0,
    MAX_BALANCE: 1000000,
    WALLET_TYPES: {
      CUSTOMER: 'customer',
      MERCHANT: 'merchant',
      STAFF: 'staff',
    },
    NOTIFICATION_RATE_LIMIT: 5, // Max notifications per hour
    DEFAULT_LANGUAGE: 'en',
  },

  // Error codes for wallet operations
  ERROR_CODES: {
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    WALLET_EXISTS: 'WALLET_EXISTS',
    INVALID_WALLET: 'INVALID_WALLET',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    INVALID_AMOUNT: 'INVALID_AMOUNT',
    INVALID_RECIPIENT: 'INVALID_RECIPIENT',
  },
};