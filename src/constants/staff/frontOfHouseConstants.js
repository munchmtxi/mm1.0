'use strict';

module.exports = {
  STAFF_ROLE: 'front_of_house',
  NAME: 'Front of House',
  DESCRIPTION: 'Handles customer-facing tasks like check-ins, orders, and support across merchants.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'grocery', 'parking_lot'],
  RESPONSIBILITIES: [
    'process_check_ins',
    'manage_bookings',
    'handle_orders',
    'coordinate_drivers',
    'resolve_disputes',
    'assist_customers',
    'monitor_parking'
  ],
  PERMISSIONS: [
    'manage_bookings',
    'process_orders',
    'manage_check_ins',
    'handle_support_requests',
    'view_customer_data',
    'coordinate_drivers',
    'view_wallet',
    'request_withdrawal',
    'escalate_issues',
    'monitor_parking'
  ],
  TASK_TYPES: {
    mtables: ['check_in', 'booking_update', 'table_assignment', 'pre_order', 'extra_order', 'resolve_dispute'],
    munch: ['takeaway_confirm', 'resolve_dispute', 'assist_customer'],
    mtxi: ['driver_pickup'],
    mevents: ['event_check_in'],
    mpark: ['parking_check_in', 'parking_assist']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['financial_compliance', 'customer_service'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'customer_service',
    'booking_management',
    'financial_compliance',
    'parking_operations'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'task_completion_rate',
      'customer_satisfaction',
      'check_in_speed',
      'booking_management',
      'parking_assist_time'
    ],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'booking_update', 'announcement', 'parking_alert'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    MAX_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_BRANCH',
    'INVALID_PARKING'
  ],
  SUCCESS_MESSAGES: [
    'task_completed',
    'booking_processed',
    'check_in_completed',
    'parking_assisted'
  ]
};