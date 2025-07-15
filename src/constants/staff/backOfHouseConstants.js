'use strict';

module.exports = {
  STAFF_ROLE: 'back_of_house',
  NAME: 'Back of House',
  DESCRIPTION: 'Manages operational tasks like inventory, supplies, and delivery preparation.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'grocery', 'dark_kitchen', 'parking_lot'],
  RESPONSIBILITIES: [
    'monitor_supplies',
    'update_inventory',
    'prepare_delivery_packages',
    'verify_driver_credentials',
    'coordinate_suppliers',
    'monitor_parking'
  ],
  PERMISSIONS: [
    'update_inventory',
    'manage_supplies',
    'process_delivery_packages',
    'verify_driver_credentials',
    'view_restocking_alerts',
    'view_wallet',
    'request_withdrawal',
    'coordinate_suppliers',
    'monitor_parking'
  ],
  TASK_TYPES: {
    mtables: ['supply_monitor', 'restock_request'],
    munch: ['update_inventory', 'prepare_delivery_package', 'restock_alert', 'coordinate_supplier'],
    mtxi: ['verify_driver'],
    mpark: ['parking_check']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['food_safety', 'financial_compliance', 'parking_operations'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'inventory_management',
    'food_safety',
    'delivery_operations',
    'supplier_coordination',
    'parking_operations'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: ['inventory_accuracy', 'task_completion_rate', 'restock_response_time', 'parking_compliance'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'restock_alert', 'announcement', 'parking_alert'],
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
    'inventory_updated',
    'delivery_package_prepared',
    'parking_checked'
  ]
};