'use strict';

module.exports = {
  STAFF_ROLE: 'manager',
  NAME: 'Manager',
  DESCRIPTION: 'Oversees operations, staff, financial approvals, and compliance across merchant types.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot'],
  RESPONSIBILITIES: [
    'approve_withdrawals',
    'manage_schedules',
    'resolve_disputes',
    'view_analytics',
    'monitor_compliance',
    'oversee_events',
    'manage_suppliers',
    'audit_operations',
    'train_staff'
  ],
  PERMISSIONS: [
    'manage_bookings',
    'process_orders',
    'update_inventory',
    'view_analytics',
    'manage_staff',
    'approve_withdrawals',
    'view_wallet',
    'request_withdrawal',
    'resolve_disputes',
    'coordinate_suppliers',
    'audit_operations',
    'train_staff'
  ],
  TASK_TYPES: {
    mtables: ['manage_bookings', 'resolve_dispute'],
    munch: ['process_orders', 'resolve_dispute', 'coordinate_supplier'],
    mevents: ['oversee_event'],
    mpark: ['monitor_parking'],
    all: ['approve_withdrawal', 'manage_schedule', 'view_analytics', 'audit_operations', 'train_staff']
  },
  SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    AI_SHIFT_SCHEDULING: true
  },
  TWO_FACTOR_AUTH: {
    ENABLED: true,
    METHODS: ['sms', 'email', 'authenticator_app']
  },
  CERTIFICATIONS: {
    REQUIRED: ['financial_compliance', 'food_safety', 'operational_management'],
    EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  TRAINING_MODULES: [
    'customer_service',
    'financial_compliance',
    'operational_management',
    'event_management',
    'supplier_management',
    'audit_procedures'
  ],
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'task_completion_rate',
      'customer_satisfaction',
      'inventory_accuracy',
      'delivery_performance',
      'booking_management',
      'event_setup_time',
      'staff_training_completion',
      'audit_completion_rate'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'compliance_alert', 'announcement', 'audit_alert'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5
  },
  ERROR_CODES: [
    'PERMISSION_DENIED',
    'TASK_ASSIGNMENT_FAILED',
    'INVALID_BRANCH',
    'INVALID_AUDIT'
  ],
  SUCCESS_MESSAGES: [
    'task_completed',
    'schedule_updated',
    'dispute_resolved',
    'withdrawal_approved',
    'audit_completed'
  ]
};