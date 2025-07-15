'use strict';

module.exports = {
  STAFF_ROLE: 'driver',
  NAME: 'Driver',
  DESCRIPTION: 'Handles delivery of orders and parking coordination across merchants.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot'],
  RESPONSIBILITIES: [
    'process_deliveries',
    'verify_orders',
    'coordinate_pickups',
    'monitor_parking'
  ],
  PERMISSIONS: [
    'process_deliveries',
    'verify_orders',
    'view_wallet',
    'request_withdrawal',
    'monitor_parking'
  ],
  TASK_TYPES: {
    mtxi: ['process_delivery', 'verify_order', 'parking_check'],
    munch: ['delivery_handover'],
    mpark: ['parking_check']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['drivers_license', 'food_safety_driver', 'parking_operations'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'food_safety',
    'delivery_operations',
    'customer_interaction',
    'parking_operations'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['delivery_time', 'task_completion_rate', 'order_accuracy', 'parking_compliance'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['delivery_assignment', 'shift_update', 'wallet_update', 'route_update', 'announcement', 'parking_alert'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    MAX_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_DELIVERY_ASSIGNMENT',
    'INVALID_PARKING'
  ],
  SUCCESS_MESSAGES: [
    'delivery_completed',
    'order_handed_over',
    'parking_checked'
  ]
};