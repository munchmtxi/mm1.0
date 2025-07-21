'use strict';

module.exports = {
  STAFF_SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 2,
    MAX_SHIFT_HOURS: 14,
    MAX_SHIFTS_PER_WEEK: 7,
    SHIFT_TYPES: ['morning', 'afternoon', 'evening', 'night'],
    AI_SHIFT_SCHEDULING: true
  },
  STAFF_WALLET_CONSTANTS: {
    WALLET_TYPE: 'staff',
    PAYMENT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'rejected', 'disputed'],
    TRANSACTION_TYPES: [
      'salary_payment', 'bonus_payment', 'withdrawal', 'delivery_earnings',
      'parking_earnings', 'stay_earnings', 'ticket_earnings'
    ],
    WALLET_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_ENABLED: true,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT', 'BNB'],
      MAX_DAILY_TRANSACTIONS: 100,
      MAX_TRANSACTION_AMOUNT: 10000
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['weekly', 'monthly'],
      TRANSACTION_CATEGORIES: [
        'salary_payment', 'bonus_payment', 'withdrawal', 'delivery_earnings',
        'parking_earnings', 'stay_earnings', 'ticket_earnings'
      ],
      METRICS: ['earnings_total', 'payout_frequency', 'transaction_success_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'authenticator_app'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    },
    ERROR_CODES: [
      'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED', 'INVALID_PAYOUT_METHOD',
      'INVALID_BANK_DETAILS'
    ],
    SUCCESS_MESSAGES: [
      'payment_processed', 'withdrawal_requested', 'salary_payment_received',
      'delivery_earnings_added', 'parking_earnings_added', 'stay_earnings_added',
      'ticket_earnings_added'
    ]
  },
  STAFF_ANALYTICS_CONSTANTS: {
    METRICS: [
      'task_completion_rate', 'prep_time', 'customer_satisfaction', 'inventory_accuracy',
      'check_in_speed', 'checkout_speed', 'delivery_time', 'event_setup_time', 'parking_compliance',
      'room_cleaning_time', 'guest_satisfaction', 'ticket_processing_time', 'event_attendance_accuracy'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      prep_time_minutes: {
        restaurant: 10, dark_kitchen: 15, butcher: 5, grocery: 10, caterer: 45, cafe: 8, bakery: 8,
        parking_lot: 5, accommodation_provider: 30, ticket_provider: 5
      },
      checkout_time_minutes: 3,
      stocking_time_minutes: 20,
      inventory_update_time_minutes: 15,
      delivery_time_minutes: 30,
      event_setup_time_minutes: 90,
      parking_assist_time_minutes: 5,
      room_cleaning_time_minutes: 60,
      ticket_processing_time_minutes: 5
    }
  },
  STAFF_NOTIFICATION_CONSTANTS: {
    TYPES: [
      'task_assignment', 'shift_update', 'wallet_update', 'training_reminder',
      'delivery_assignment', 'profile_created', 'profile_updated', 'announcement',
      'event_assignment', 'consultation_scheduled', 'compliance_alert', 'parking_alert',
      'stay_assignment', 'room_maintenance_alert', 'ticket_assignment', 'event_coordination_alert'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  STAFF_AUDIT_ACTIONS: [
    'staff_profile_create', 'staff_profile_update', 'staff_compliance_verify',
    'staff_profile_retrieve', 'driver_assignment', 'event_assignment', 'parking_assignment',
    'stay_assignment', 'ticket_assignment'
  ],
  STAFF_ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'accessible_seating'],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    LANGUAGE_ACCESSIBILITY: true,
    ALLOWED_DIETARY_FILTERS: [
      'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo'
    ]
  },
  STAFF_CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mevents', 'mpark', 'mstays', 'mtickets'],
    UI_CONSISTENCY: { THEME: 'default', COLOR_SCHEME: 'neutral', FONT_FAMILY: 'Roboto' }
  },
  STAFF_OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 100,
    SYNC_INTERVAL_MINUTES: 3,
    WEBSOCKET_HEARTBEAT_SECONDS: 20,
    MAX_OFFLINE_TRANSACTIONS: 100
  },
  STAFF_SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    PERMISSION_LEVELS: ['read', 'write', 'admin'],
    MFA_METHODS: ['sms', 'email', 'authenticator_app'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    AUDIT_LOG_RETENTION_DAYS: 365
  },
  STAFF_ERROR_CODES: [
    'INVALID_STAFF_TYPE', 'STAFF_NOT_FOUND', 'PERMISSION_DENIED', 'WALLET_INSUFFICIENT_FUNDS',
    'PAYMENT_FAILED', 'COMPLIANCE_VIOLATION', 'TASK_ASSIGNMENT_FAILED', 'OFFLINE_MODE_UNAVAILABLE',
    'INVALID_EMAIL', 'INVALID_PHONE', 'INVALID_BANK_DETAILS', 'INVALID_CERTIFICATION',
    'INCOMPLETE_PROFILE', 'MISSING_CERTIFICATIONS', 'INVALID_BRANCH', 'INVALID_GEOFENCE',
    'INVALID_DELIVERY_ASSIGNMENT', 'INVALID_EVENT_ASSIGNMENT', 'INVALID_PARKING_ASSIGNMENT',
    'INVALID_STAY_ASSIGNMENT', 'INVALID_TICKET_ASSIGNMENT', 'INVALID_AUDIT', 'INVALID_SUPPLIER',
    'INVALID_INVENTORY', 'INVALID_ROOM_STATUS', 'INVALID_CONSULTATION'
  ],
  SUCCESS_MESSAGES: [
    'staff_onboarded', 'task_completed', 'payment_processed', 'withdrawal_requested',
    'training_completed', 'delivery_completed', 'event_setup_completed', 'consultation_scheduled',
    'parking_assisted', 'stay_completed', 'ticket_sold', 'order_processed', 'check_in_completed',
    'order_prepared', 'inventory_updated', 'meat_order_prepared', 'beverage_prepared',
    'delivery_verified', 'discrepancy_reported', 'checkout_processed', 'refund_processed',
    'ticket_sale_processed', 'order_packaged', 'parking_checked', 'check_in_out_completed',
    'ticket_checked', 'schedule_updated', 'dispute_resolved', 'withdrawal_approved',
    'audit_completed', 'stay_assignment_completed', 'ticket_assignment_completed',
    'room_cleaned', 'maintenance_reported', 'inquiry_handled'
  ]
};