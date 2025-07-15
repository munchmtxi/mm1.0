'use strict';

module.exports = {
  STAFF_ROLE: 'car_park_operative',
  NAME: 'Car Park Operative',
  DESCRIPTION: 'Manages parking operations, customer assistance, and payments for parking lot merchants.',
  SUPPORTED_MERCHANT_TYPES: ['parking_lot'],
  RESPONSIBILITIES: [
    'monitor_parking',
    'assist_parking',
    'process_payments',
    'report_issues',
    'coordinate_valets'
  ],
  PERMISSIONS: [
    'monitor_parking',
    'assist_parking',
    'process_payments',
    'view_wallet',
    'request_withdrawal',
    'report_issues',
    'coordinate_valets'
  ],
  TASK_TYPES: {
    mpark: ['monitor_parking', 'assist_parking', 'process_payment', 'report_issue', 'coordinate_valet']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['parking_operations'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'parking_operations',
    'customer_service',
    'payment_processing'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['parking_assist_time', 'task_completion_rate', 'customer_satisfaction', 'payment_accuracy'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'parking_alert', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    MAX_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_BRANCH',
    'INVALID_PARKING_ASSIGNMENT'
  ],
  SUCCESS_MESSAGES: [
    'task_completed',
    'parking_assisted',
    'payment_processed'
  ]
};