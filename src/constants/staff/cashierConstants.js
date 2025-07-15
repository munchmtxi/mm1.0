'use strict';

module.exports = {
  STAFF_ROLE: 'cashier',
  NAME: 'Cashier',
  DESCRIPTION: 'Processes sales, customer inquiries, and refunds for grocery and cafe merchants.',
  SUPPORTED_MERCHANT_TYPES: ['grocery', 'cafe'],
  RESPONSIBILITIES: [
    'process_checkouts',
    'handle_inquiries',
    'resolve_disputes',
    'process_refunds',
    'monitor_transactions'
  ],
  PERMISSIONS: [
    'process_checkout',
    'handle_inquiries',
    'view_wallet',
    'request_withdrawal',
    'process_refunds',
    'view_transactions'
  ],
  TASK_TYPES: {
    munch: ['process_checkout', 'resolve_dispute', 'process_refund', 'monitor_transaction']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['financial_compliance', 'payment_processing'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'customer_service',
    'payment_processing',
    'financial_compliance',
    'refund_management'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['checkout_speed', 'customer_satisfaction', 'transaction_accuracy', 'refund_processing_time'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'payment_update', 'announcement', 'refund_alert'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    MAX_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_BRANCH',
    'INVALID_REFUND'
  ],
  SUCCESS_MESSAGES: [
    'task_completed',
    'checkout_processed',
    'refund_processed'
  ]
};