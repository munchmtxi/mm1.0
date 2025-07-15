'use strict';

module.exports = {
  STAFF_ROLE: 'chef',
  NAME: 'Chef',
  DESCRIPTION: 'Prepares food for dine-in, takeaway, delivery, and events with dietary compliance.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'caterer', 'cafe', 'bakery'],
  RESPONSIBILITIES: [
    'prepare_food',
    'ensure_dietary_compliance',
    'support_event_catering',
    'update_order_status',
    'monitor_kitchen_inventory'
  ],
  PERMISSIONS: [
    'view_orders',
    'update_order_statuses',
    'prepare_food',
    'view_wallet',
    'request_withdrawal',
    'view_kitchen_inventory'
  ],
  TASK_TYPES: {
    mtables: ['prep_order'],
    munch: ['prep_order', 'monitor_inventory'],
    mevents: ['event_food_prep']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['food_safety', 'halal_certification', 'kosher_certification'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'food_safety',
    'dietary_compliance',
    'event_catering',
    'inventory_management'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['prep_time', 'task_completion_rate', 'dietary_compliance_rate', 'inventory_accuracy'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'order_update', 'announcement', 'inventory_alert'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    MAX_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_BRANCH',
    'INVALID_INVENTORY'
  ],
  SUCCESS_MESSAGES: [
    'task_completed',
    'order_prepared',
    'inventory_updated'
  ]
};