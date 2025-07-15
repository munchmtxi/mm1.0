'use strict';

module.exports = {
  STAFF_ROLE: 'butcher',
  NAME: 'Butcher',
  DESCRIPTION: 'Prepares meat orders with custom cuts, dietary compliance, and inventory updates.',
  SUPPORTED_MERCHANT_TYPES: ['butcher'],
  RESPONSIBILITIES: [
    'prepare_meat',
    'customize_orders',
    'update_inventory',
    'ensure_dietary_compliance',
    'coordinate_suppliers'
  ],
  PERMISSIONS: [
    'prepare_meat',
    'update_inventory',
    'customize_order',
    'view_wallet',
    'request_withdrawal',
    'coordinate_suppliers'
  ],
  TASK_TYPES: {
    munch: ['prepare_meat', 'update_inventory', 'customize_order', 'coordinate_supplier']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['food_safety', 'halal_certification', 'meat_preparation'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'food_safety',
    'meat_preparation',
    'dietary_compliance',
    'supplier_coordination'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['prep_time', 'inventory_accuracy', 'task_completion_rate', 'dietary_compliance_rate'],
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
    'meat_order_prepared',
    'inventory_updated'
  ]
};