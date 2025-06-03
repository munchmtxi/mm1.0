'use strict';

module.exports = {
  TIP_SETTINGS: {
    MIN_AMOUNT: 0.01,
    MAX_AMOUNT: 1000.00,
    TIP_STATUSES: ['pending', 'completed', 'failed'],
    SERVICE_TYPES: ['ride', 'order', 'booking', 'event_service', 'in_dining_order'],
    RECIPIENT_ROLES: ['driver', 'staff'],
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP'],
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: {
      TIP_SENT: 'TIP_SENT',
      TIP_RECEIVED: 'TIP_RECEIVED',
      TIP_UPDATED: 'TIP_UPDATED',
      TIP_FAILED: 'TIP_FAILED',
    },
    DELIVERY_METHODS: {
      PUSH: 'push',
      EMAIL: 'email',
    },
    PRIORITY_LEVELS: {
      MEDIUM: 'medium',
      HIGH: 'high',
    },
  },
  ERROR_CODES: [
    'INVALID_CUSTOMER',
    'INVALID_RECIPIENT',
    'INVALID_RIDE',
    'INVALID_ORDER',
    'INVALID_BOOKING',
    'INVALID_EVENT_SERVICE',
    'INVALID_IN_DINING_ORDER',
    'INVALID_WALLET',
    'INSUFFICIENT_BALANCE',
    'INVALID_AMOUNT',
    'TIP_ALREADY_EXISTS',
    'TIP_NOT_FOUND',
    'TIP_ACTION_FAILED',
  ],
};