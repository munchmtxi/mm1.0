'use strict';

module.exports = {
  STAFF_ROLE: 'barista',
  NAME: 'Barista',
  DESCRIPTION: 'Prepares beverages, light food, and manages inventory for cafe merchants.',
  SUPPORTED_MERCHANT_TYPES: ['cafe'],
  RESPONSIBILITIES: [
    'prepare_beverages',
    'prepare_light_food',
    'update_inventory',
    'assist_customers'
  ],
  PERMISSIONS: [
    'prepare_beverage',
    'prepare_food',
    'update_inventory',
    'view_wallet',
    'request_withdrawal',
    'assist_customers'
  ],
  TASK_TYPES: {
    munch: ['prepare_beverage', 'prepare_food', 'update_inventory', 'assist_customer']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['food_safety', 'beverage_preparation'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'food_safety',
    'beverage_preparation',
    'customer_service',
    'inventory_management'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['prep_time', 'task_completion_rate', 'customer_satisfaction', 'inventory_accuracy'],
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
    'beverage_prepared',
    'inventory_updated'
  ]
};