/**
 * notificationConstants.js
 *
 * Defines shared notification constants for all roles across services.
 * Aligns with customerConstants.js, rideConstants.js, and paymentConstants.js.
 *
 * Last Updated: May 27, 2025
 */

'use strict';

module.exports = {
  NOTIFICATION_TYPES: [
    'booking_confirmation', 'order_update', 'ride_update', 'payment_confirmation',
    'wallet_update', 'friend_request', 'event_invite', 'promotion', 'support_response',
    'ride_request', 'delivery_request', 'tip_received', 'safety_alert', 'high_demand',
    'ride_accepted', 'ride_completed', 'withdrawal_processed', 'deposit_confirmed',
    'transaction_failed', 'cashback_successful'
  ],
  DELIVERY_METHODS: ['push', 'sms', 'email'],
  PRIORITY_LEVELS: ['low', 'medium', 'high'],
  NOTIFICATION_SETTINGS: {
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60,
    DATA_RETENTION_DAYS: 90
  },
  ERROR_CODES: ['NOTIFICATION_DELIVERY_FAILED', 'INVALID_NOTIFICATION_TYPE', 'RATE_LIMIT_EXCEEDED'],
  SUCCESS_MESSAGES: ['Notification sent']
};