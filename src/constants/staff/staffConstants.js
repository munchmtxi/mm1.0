'use strict';

module.exports = {
  STAFF_PROFILE_CONSTANTS: {
    ALLOWED_STAFF_TYPES: [
      'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
      'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
      'back_of_house', 'car_park_operative'
    ],
    ALLOWED_CERTIFICATIONS: [
      'food_safety', 'financial_compliance', 'halal_certification', 'kosher_certification',
      'drivers_license', 'food_safety_driver', 'parking_operations', 'inventory_management',
      'payment_processing', 'meat_preparation', 'beverage_preparation', 'operational_management'
    ],
    REQUIRED_CERTIFICATIONS: {
      server: ['financial_compliance', 'customer_service'],
      host: ['financial_compliance', 'customer_service'],
      chef: ['food_safety', 'halal_certification', 'kosher_certification'],
      manager: ['financial_compliance', 'food_safety', 'operational_management'],
      butcher: ['food_safety', 'halal_certification', 'meat_preparation'],
      barista: ['food_safety', 'beverage_preparation'],
      stock_clerk: ['financial_compliance', 'inventory_management'],
      picker: ['financial_compliance'],
      cashier: ['financial_compliance', 'payment_processing'],
      driver: ['drivers_license', 'food_safety_driver', 'parking_operations'],
      packager: ['food_safety'],
      event_staff: ['food_safety'],
      consultant: ['financial_compliance'],
      front_of_house: ['financial_compliance', 'customer_service'],
      back_of_house: ['food_safety', 'financial_compliance', 'parking_operations'],
      car_park_operative: ['parking_operations']
    }
  },
  STAFF_STATUSES: ['active', 'inactive', 'pending_onboarding', 'suspended', 'terminated'],
  STAFF_SETTINGS: {
    MAX_STAFF_PER_BRANCH: 200,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: {
      ENABLED: true,
      METHODS: ['sms', 'email', 'authenticator_app']
    }
  },
  STAFF_ROLES: {
    server: {
      name: 'Server',
      supportedMerchantTypes: ['restaurant'],
      description: 'Handles table service and customer interactions.',
      responsibilities: ['serve_tables', 'process_orders', 'manage_check_ins', 'handle_inquiries', 'resolve_disputes']
    },
    host: {
      name: 'Host',
      supportedMerchantTypes: ['restaurant'],
      description: 'Manages table bookings and customer greetings.',
      responsibilities: ['process_check_ins', 'manage_bookings', 'assign_tables', 'resolve_disputes']
    },
    chef: {
      name: 'Chef',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'caterer', 'cafe', 'bakery'],
      description: 'Prepares food for dine-in, takeaway, delivery, and events.',
      responsibilities: ['prepare_food', 'ensure_dietary_compliance', 'update_order_status', 'monitor_kitchen_inventory']
    },
    manager: {
      name: 'Manager',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot'],
      description: 'Oversees operations, staff, and financial approvals.',
      responsibilities: ['approve_withdrawals', 'manage_schedules', 'resolve_disputes', 'view_analytics', 'audit_operations', 'train_staff']
    },
    butcher: {
      name: 'Butcher',
      supportedMerchantTypes: ['butcher'],
      description: 'Prepares meat orders with dietary compliance.',
      responsibilities: ['prepare_meat', 'customize_orders', 'update_inventory', 'coordinate_suppliers']
    },
    barista: {
      name: 'Barista',
      supportedMerchantTypes: ['cafe'],
      description: 'Prepares beverage and light food orders.',
      responsibilities: ['prepare_beverages', 'prepare_light_food', 'update_inventory', 'assist_customers']
    },
    stock_clerk: {
      name: 'Stock Clerk',
      supportedMerchantTypes: ['grocery'],
      description: 'Manages inventory and shelf stocking.',
      responsibilities: ['restock_shelves', 'verify_delivery', 'update_inventory', 'coordinate_suppliers', 'report_discrepancies']
    },
    picker: {
      name: 'Picker',
      supportedMerchantTypes: ['grocery'],
      description: 'Picks items for customer orders.',
      responsibilities: ['pick_orders', 'handle_substitutions']
    },
    cashier: {
      name: 'Cashier',
      supportedMerchantTypes: ['grocery', 'cafe'],
      description: 'Processes sales and customer inquiries.',
      responsibilities: ['process_checkouts', 'handle_inquiries', 'resolve_disputes', 'process_refunds']
    },
    driver: {
      name: 'Driver',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'grocery', 'caterer', 'cafe', 'bakery', 'parking_lot'],
      description: 'Handles delivery of orders and parking coordination.',
      responsibilities: ['process_deliveries', 'verify_orders', 'coordinate_pickups', 'monitor_parking']
    },
    packager: {
      name: 'Packager',
      supportedMerchantTypes: ['dark_kitchen', 'grocery', 'butcher', 'caterer'],
      description: 'Packages orders for delivery or pickup.',
      responsibilities: ['package_orders', 'ensure_labeling', 'coordinate_drivers']
    },
    event_staff: {
      name: 'Event Staff',
      supportedMerchantTypes: ['caterer'],
      description: 'Supports event setup and service.',
      responsibilities: ['setup_events', 'serve_events', 'handle_event_inquiries']
    },
    consultant: {
      name: 'Consultant',
      supportedMerchantTypes: ['caterer'],
      description: 'Manages client consultations for events.',
      responsibilities: ['conduct_consultations', 'customize_menus']
    },
    front_of_house: {
      name: 'Front of House',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'parking_lot'],
      description: 'Handles customer-facing tasks.',
      responsibilities: ['process_check_ins', 'manage_bookings', 'handle_orders', 'monitor_parking']
    },
    back_of_house: {
      name: 'Back of House',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'dark_kitchen', 'parking_lot'],
      description: 'Manages operational tasks like inventory and parking.',
      responsibilities: ['monitor_supplies', 'update_inventory', 'prepare_delivery_packages', 'monitor_parking']
    },
    car_park_operative: {
      name: 'Car Park Operative',
      supportedMerchantTypes: ['parking_lot'],
      description: 'Manages parking operations and customer assistance.',
      responsibilities: ['monitor_parking', 'assist_parking', 'process_payments', 'report_issues']
    }
  },
  STAFF_PERMISSIONS: {
    server: [
      'serve_table', 'process_orders', 'manage_check_ins', 'handle_support_requests',
      'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'
    ],
    host: [
      'manage_bookings', 'manage_check_ins', 'table_assignment', 'handle_support_requests',
      'view_customer_data', 'view_wallet', 'request_withdrawal', 'escalate_issues'
    ],
    chef: [
      'view_orders', 'update_order_statuses', 'prepare_food', 'view_wallet', 'request_withdrawal',
      'view_kitchen_inventory'
    ],
    manager: [
      'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics',
      'manage_staff', 'approve_withdrawals', 'view_wallet', 'request_withdrawal', 'resolve_disputes',
      'audit_operations', 'train_staff'
    ],
    butcher: [
      'prepare_meat', 'update_inventory', 'customize_order', 'view_wallet', 'request_withdrawal',
      'coordinate_suppliers'
    ],
    barista: [
      'prepare_beverage', 'prepare_food', 'update_inventory', 'view_wallet', 'request_withdrawal',
      'assist_customers'
    ],
    stock_clerk: [
      'stock_shelves', 'update_inventory', 'verify_deliveries', 'view_wallet', 'request_withdrawal',
      'coordinate_suppliers', 'report_discrepancies'
    ],
    picker: [
      'pick_order', 'handle_substitutions', 'view_wallet', 'request_withdrawal'
    ],
    cashier: [
      'process_checkout', 'handle_inquiries', 'view_wallet', 'request_withdrawal', 'process_refunds',
      'view_transactions'
    ],
    driver: [
      'process_deliveries', 'verify_orders', 'view_wallet', 'request_withdrawal', 'monitor_parking'
    ],
    packager: [
      'package_order', 'update_inventory', 'view_wallet', 'request_withdrawal'
    ],
    event_staff: [
      'event_setup', 'serve_event', 'view_wallet', 'request_withdrawal'
    ],
    consultant: [
      'client_consultation', 'customize_menu', 'view_wallet', 'request_withdrawal'
    ],
    front_of_house: [
      'manage_bookings', 'process_orders', 'manage_check_ins', 'handle_support_requests',
      'view_customer_data', 'coordinate_drivers', 'view_wallet', 'request_withdrawal', 'escalate_issues',
      'monitor_parking'
    ],
    back_of_house: [
      'update_inventory', 'manage_supplies', 'process_delivery_packages',
      'verify_driver_credentials', 'view_restocking_alerts', 'view_wallet', 'request_withdrawal',
      'coordinate_suppliers', 'monitor_parking'
    ],
    car_park_operative: [
      'monitor_parking', 'assist_parking', 'process_payments', 'view_wallet', 'request_withdrawal',
      'report_issues'
    ]
  },
  STAFF_TASK_TYPES: {
    server: {
      mtables: ['serve_table', 'check_in', 'pre_order', 'extra_order', 'resolve_dispute'],
      munch: ['takeaway_confirm', 'resolve_dispute']
    },
    host: {
      mtables: ['check_in', 'booking_update', 'table_assignment', 'resolve_dispute'],
      munch: ['takeaway_confirm']
    },
    chef: {
      mtables: ['prep_order'],
      munch: ['prep_order', 'monitor_inventory'],
      mevents: ['event_food_prep']
    },
    manager: {
      all: ['approve_withdrawal', 'manage_schedule', 'resolve_dispute', 'view_analytics', 'audit_operations', 'train_staff']
    },
    butcher: {
      munch: ['prepare_meat', 'update_inventory', 'customize_order', 'coordinate_supplier']
    },
    barista: {
      munch: ['prepare_beverage', 'prepare_food', 'update_inventory', 'assist_customer']
    },
    stock_clerk: {
      munch: ['stock_shelves', 'update_inventory', 'verify_delivery', 'coordinate_supplier', 'report_discrepancy']
    },
    picker: {
      munch: ['pick_order', 'handle_substitutions']
    },
    cashier: {
      munch: ['process_checkout', 'resolve_dispute', 'process_refund', 'monitor_transaction']
    },
    driver: {
      mtxi: ['process_delivery', 'verify_order', 'parking_check'],
      munch: ['delivery_handover'],
      mpark: ['parking_check']
    },
    packager: {
      munch: ['package_order', 'update_inventory'],
      mtxi: ['verify_driver']
    },
    event_staff: {
      mevents: ['event_setup', 'serve_event'],
      munch: ['prep_order']
    },
    consultant: {
      mevents: ['client_consultation', 'customize_menu']
    },
    front_of_house: {
      mtables: ['check_in', 'booking_update', 'table_assignment', 'pre_order', 'extra_order', 'resolve_dispute'],
      munch: ['takeaway_confirm', 'resolve_dispute', 'assist_customer'],
      mtxi: ['driver_pickup'],
      mevents: ['event_check_in'],
      mpark: ['parking_check_in', 'parking_assist']
    },
    back_of_house: {
      mtables: ['supply_monitor', 'restock_request'],
      munch: ['update_inventory', 'prepare_delivery_package', 'restock_alert', 'coordinate_supplier'],
      mtxi: ['verify_driver'],
      mpark: ['parking_check']
    },
    car_park_operative: {
      mpark: ['monitor_parking', 'assist_parking', 'process_payment', 'report_issue']
    }
  },
  STAFF_TASK_STATUSES: ['assigned', 'in_progress', 'completed', 'delayed', 'failed', 'cancelled'],
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
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_ENABLED: true,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT', 'BNB']
    },
    TRANSACTION_TYPES: ['salary_payment', 'bonus_payment', 'withdrawal', 'delivery_earnings', 'parking_earnings'],
    TRANSACTION_LIMITS: {
      MAX_DAILY_TRANSACTIONS: 100,
      MAX_TRANSACTION_AMOUNT: 10000
    }
  },
  STAFF_ANALYTICS_CONSTANTS: {
    METRICS: [
      'task_completion_rate', 'prep_time', 'customer_satisfaction', 'inventory_accuracy',
      'check_in_speed', 'checkout_speed', 'delivery_time', 'event_setup_time', 'parking_compliance'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      PREP_TIME_MINUTES: {
        restaurant: 10,
        dark_kitchen: 15,
        butcher: 5,
        grocery: 10,
        caterer: 45,
        cafe: 8,
        bakery: 8,
        parking_lot: 5
      },
      CHECKOUT_TIME_MINUTES: 3,
      STOCKING_TIME_MINUTES: 20,
      INVENTORY_UPDATE_TIME_MINUTES: 15,
      DELIVERY_TIME_MINUTES: 30,
      EVENT_SETUP_TIME_MINUTES: 90,
      PARKING_ASSIST_TIME_MINUTES: 5
    }
  },
  STAFF_NOTIFICATION_CONSTANTS: {
    TYPES: [
      'task_assignment', 'shift_update', 'wallet_update', 'training_reminder',
      'delivery_assignment', 'profile_created', 'profile_updated', 'announcement',
      'event_assignment', 'consultation_scheduled', 'compliance_alert', 'parking_alert'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  STAFF_AUDIT_ACTIONS: [
    'staff_profile_create', 'staff_profile_update', 'staff_compliance_verify',
    'staff_profile_retrieve', 'driver_assignment', 'event_assignment', 'parking_assignment'
  ],
  STAFF_ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands'],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    LANGUAGE_ACCESSIBILITY: true,
    ALLOWED_DIETARY_FILTERS: [
      'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo'
    ]
  },
  STAFF_CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mtxi', 'mevents', 'mpark'],
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
    'INVALID_DELIVERY_ASSIGNMENT', 'INVALID_EVENT_ASSIGNMENT', 'INVALID_PARKING_ASSIGNMENT'
  ],
  SUCCESS_MESSAGES: [
    'staff_onboarded', 'task_completed', 'payment_processed', 'withdrawal_requested',
    'training_completed', 'delivery_completed', 'event_setup_completed', 'consultation_scheduled',
    'parking_assisted'
  ]
};