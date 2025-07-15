'use strict';

module.exports = {
  STAFF_ROLE: 'stock_clerk',
  NAME: 'Stock Clerk',
  DESCRIPTION: 'Manages inventory, shelf stocking, and supplier coordination for grocery merchants.',
  SUPPORTED_MERCHANT_TYPES: ['grocery'],
  RESPONSIBILITIES: [
    'restock_shelves',
    'verify_delivery',
    'update_inventory',
    'support_bulk_orders',
    'coordinate_suppliers',
    'monitor_stock_levels',
    'report_discrepancies'
  ],
  PERMISSIONS: [
    'stock_shelves',
    'update_inventory',
    'verify_deliveries',
    'view_wallet',
    'request_withdrawal',
    'coordinate_suppliers',
    'view_stock_reports',
    'report_discrepancies'
  ],
  TASK_TYPES: {
    munch: ['stock_shelves', 'update_inventory', 'verify_delivery', 'coordinate_supplier', 'report_discrepancy']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  CERTIFICATIONS: {
    REQUIRED: ['financial_compliance', 'inventory_management'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'inventory_management',
    'financial_compliance',
    'operational_safety',
    'supplier_coordination'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'inventory_accuracy',
      'stocking_time',
      'task_completion_rate',
      'discrepancy_resolution_time',
      'supplier_response_time'
    ],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'restock_alert', 'announcement', 'discrepancy_alert'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    MAX_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_BRANCH',
    'INVALID_SUPPLIER'
  ],
  SUCCESS_MESSAGES: [
    'task_completed',
    'inventory_updated',
    'delivery_verified',
    'discrepancy_reported'
  ]
};