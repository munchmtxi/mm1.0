/**
 * staffConstants.js
 *
 * Defines constants for the Staff Role System, covering staff types, roles, permissions,
 * tasks, shifts, training, financial management, compliance, analytics, notifications,
 * accessibility, cross-vertical integration, operational resilience, security, and
 * error/success messages. Supports staff acting as drivers and interactions with merchant
 * types (restaurant, dark_kitchen, butcher, grocery, caterer, cafe, bakery). Includes
 * global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa, India,
 * Brazil) with inclusivity features (e.g., halal filters) and aligns with
 * driverConstants.js, customerConstants.js, and admin constants.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Staff Profile Constants
  STAFF_PROFILE_CONSTANTS: {
    ALLOWED_STAFF_TYPES: [
      'front_of_house', 'back_of_house', 'kitchen', 'manager', 'butcher',
      'barista', 'stock_clerk', 'cashier', 'driver'
    ],
    ALLOWED_CERTIFICATIONS: [
      'food_safety', 'financial_compliance', 'halal_certification',
      'drivers_license', 'food_safety_driver'
    ],
    REQUIRED_CERTIFICATIONS: {
      front_of_house: ['financial_compliance'],
      back_of_house: ['food_safety', 'financial_compliance'],
      kitchen: ['food_safety', 'halal_certification'],
      manager: ['financial_compliance'],
      butcher: ['food_safety', 'halal_certification'],
      barista: ['food_safety'],
      stock_clerk: ['financial_compliance'],
      cashier: ['financial_compliance'],
      driver: ['drivers_license', 'food_safety_driver']
    }
  },

  // Staff Types
  STAFF_TYPES: [
    'front_of_house', 'back_of_house', 'kitchen', 'manager', 'butcher',
    'barista', 'stock_clerk', 'cashier', 'driver'
  ],

  // Staff Statuses
  STAFF_STATUSES: ['active', 'inactive', 'pending_onboarding', 'suspended'],

  // Staff Configuration
  STAFF_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'yo', 'zu'],
    SUPPORTED_CITIES: {
      US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
      UK: ['London', 'Manchester', 'Birmingham', 'Glasgow'],
      CA: ['Toronto', 'Vancouver', 'Montreal'],
      AU: ['Sydney', 'Melbourne', 'Brisbane'],
      MW: ['Lilongwe', 'Blantyre', 'Mzuzu'],
      TZ: ['Dar es Salaam', 'Dodoma', 'Arusha'],
      KE: ['Nairobi', 'Mombasa', 'Kisumu'],
      MZ: ['Maputo', 'Beira', 'Nampula'],
      NG: ['Lagos', 'Abuja', 'Kano'],
      ZA: ['Johannesburg', 'Cape Town', 'Durban'],
      IN: ['Mumbai', 'Delhi', 'Bangalore'],
      BR: ['São Paulo', 'Rio de Janeiro', 'Brasília']
    },
    DEFAULT_TIMEZONE: 'UTC',
    MAX_STAFF_PER_BRANCH: 100,
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30
  },

  // Staff Roles and Responsibilities
  STAFF_ROLES: {
    front_of_house: {
      name: 'Front of House',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery'],
      description: 'Handles customer-facing tasks like check-ins, orders, and support.',
      responsibilities: [
        'Process check-ins and manage bookings (mtables)',
        'Handle pre-orders, extra orders, and takeaway confirmations (munch)',
        'Coordinate driver pickups (mtxi)',
        'Address customer inquiries and resolve disputes',
        'Log gamification points'
      ]
    },
    back_of_house: {
      name: 'Back of House',
      supportedMerchantTypes: ['restaurant', 'cafe', 'grocery', 'dark_kitchen'],
      description: 'Manages operational tasks like inventory and supply monitoring.',
      responsibilities: [
        'Monitor dining supplies and inventory (mtables, munch)',
        'Prepare delivery packages and verify driver credentials (munch, mtxi)',
        'Process restocking alerts'
      ]
    },
    kitchen: {
      name: 'Kitchen',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'caterer', 'cafe', 'bakery'],
      description: 'Prepares food for dine-in, takeaway, and delivery.',
      responsibilities: [
        'Prepare pre-ordered and extra food (mtables)',
        'Prepare delivery/takeaway food (munch)',
        'Log gamification points for prep speed'
      ]
    },
    manager: {
      name: 'Manager',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],
      description: 'Oversees operations, staff, and financial approvals.',
      responsibilities: [
        'Approve staff withdrawals and manage schedules',
        'View analytics and performance reports',
        'Resolve escalated disputes',
        'Monitor compliance and certifications'
      ]
    },
    butcher: {
      name: 'Butcher',
      supportedMerchantTypes: ['butcher'],
      description: 'Prepares meat orders for customers.',
      responsibilities: [
        'Prepare meat orders with dietary compliance (munch)',
        'Update inventory for meat supplies',
        'Log gamification points for prep accuracy'
      ]
    },
    barista: {
      name: 'Barista',
      supportedMerchantTypes: ['cafe'],
      description: 'Prepares coffee and beverage orders.',
      responsibilities: [
        'Prepare coffee orders (munch)',
        'Log gamification points for prep speed'
      ]
    },
    stock_clerk: {
      name: 'Stock Clerk',
      supportedMerchantTypes: ['grocery'],
      description: 'Manages inventory and shelf stocking.',
      responsibilities: [
        'Restock shelves and track inventory (munch)',
        'Verify delivery accuracy',
        'Log gamification points for stocking efficiency'
      ]
    },
    cashier: {
      name: 'Cashier',
      supportedMerchantTypes: ['grocery', 'cafe'],
      description: 'Processes sales and customer inquiries.',
      responsibilities: [
        'Process checkouts and handle inquiries (munch)',
        'Log gamification points for checkout speed'
      ]
    },
    driver: {
      name: 'Driver',
      supportedMerchantTypes: ['restaurant', 'dark_kitchen', 'grocery', 'caterer', 'cafe', 'bakery'],
      description: 'Handles delivery of orders.',
      responsibilities: [
        'Pick up and deliver orders (mtxi)',
        'Log gamification points for delivery performance',
        'Verify order accuracy at pickup'
      ]
    }
  },

  // Permissions by Role
  STAFF_PERMISSIONS: {
    front_of_house: [
      'manage_bookings', 'process_orders', 'manage_check_ins', 'handle_support_requests',
      'view_customer_data', 'coordinate_drivers', 'view_wallet', 'request_withdrawal',
      'log_gamification', 'escalate_issues'
    ],
    back_of_house: [
      'update_inventory', 'manage_supplies', 'process_delivery_packages',
      'verify_driver_credentials', 'view_restocking_alerts', 'view_wallet',
      'request_withdrawal', 'log_gamification'
    ],
    kitchen: ['view_orders', 'update_order_statuses', 'view_wallet', 'request_withdrawal', 'log_gamification'],
    manager: [
      'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics',
      'manage_staff', 'approve_withdrawals', 'view_wallet', 'request_withdrawal',
      'log_gamification', 'resolve_disputes'
    ],
    butcher: ['prepare_meat', 'update_inventory', 'view_wallet', 'request_withdrawal', 'log_gamification'],
    barista: ['prepare_coffee', 'view_wallet', 'request_withdrawal', 'log_gamification'],
    stock_clerk: ['stock_shelves', 'update_inventory', 'verify_deliveries', 'view_wallet', 'request_withdrawal', 'log_gamification'],
    cashier: ['process_checkout', 'handle_inquiries', 'view_wallet', 'request_withdrawal', 'log_gamification'],
    driver: ['process_deliveries', 'verify_orders', 'view_wallet', 'request_withdrawal', 'log_gamification']
  },

  // Task Types by Role and Vertical
  STAFF_TASK_TYPES: {
    front_of_house: {
      mtables: ['check_in', 'booking_update', 'table_assignment', 'pre_order', 'extra_order', 'resolve_dispute'],
      munch: ['takeaway_confirm', 'resolve_dispute'],
      mtxi: ['driver_pickup'],
      mevents: ['event_check_in']
    },
    back_of_house: {
      mtables: ['supply_monitor', 'restock_request'],
      munch: ['update_inventory', 'prepare_delivery_package', 'restock_alert'],
      mtxi: ['verify_driver']
    },
    kitchen: {
      mtables: ['prep_order'],
      munch: ['prep_order'],
      mevents: ['event_food_prep']
    },
    manager: {
      all: ['approve_withdrawal', 'manage_schedule', 'resolve_dispute', 'view_analytics']
    },
    butcher: {
      munch: ['prepare_meat', 'update_inventory']
    },
    barista: {
      munch: ['prepare_coffee']
    },
    stock_clerk: {
      munch: ['stock_shelves', 'update_inventory', 'verify_delivery']
    },
    cashier: {
      munch: ['process_checkout', 'resolve_dispute']
    },
    driver: {
      mtxi: ['process_delivery', 'verify_order'],
      munch: ['delivery_handover']
    }
  },

  // Task Statuses
  STAFF_TASK_STATUSES: ['assigned', 'in_progress', 'completed', 'delayed', 'failed'],

  // Shift Settings
  STAFF_SHIFT_SETTINGS: {
    MIN_SHIFT_HOURS: 4,
    MAX_SHIFT_HOURS: 12,
    MAX_SHIFTS_PER_WEEK: 6,
    SHIFT_TYPES: ['morning', 'afternoon', 'evening', 'night']
  },

  // Training Categories
  STAFF_TRAINING_CATEGORIES: [
    {
      id: 'customer_service',
      name: 'Customer Service',
      roles: ['front_of_house', 'manager', 'cashier'],
      required: true,
      topics: ['Handling Inquiries', 'Dispute Resolution', 'Customer Engagement']
    },
    {
      id: 'food_safety',
      name: 'Food Safety',
      roles: ['kitchen', 'butcher', 'barista', 'back_of_house', 'driver'],
      required: true,
      topics: ['Hygiene Standards', 'Allergen Management', 'Halal Compliance']
    },
    {
      id: 'financial',
      name: 'Financial Policies',
      roles: ['front_of_house', 'back_of_house', 'kitchen', 'manager', 'butcher', 'barista', 'stock_clerk', 'cashier'],
      required: true,
      topics: ['Wallet Usage', 'Fraud Prevention', 'Tax Compliance']
    },
    {
      id: 'operational',
      name: 'Operational Procedures',
      roles: ['back_of_house', 'stock_clerk', 'manager'],
      required: false,
      topics: ['Inventory Management', 'Delivery Coordination']
    },
    {
      id: 'driver_training',
      name: 'Driver Training',
      roles: ['driver'],
      required: true,
      topics: ['Safe Driving', 'Order Handling', 'Customer Interaction']
    }
  ],

  // Wallet and Financial Management
  STAFF_WALLET_CONSTANTS: {
    WALLET_TYPE: 'staff',
    PAYMENT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'rejected'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 10,
      MAX_PAYOUT_AMOUNT: 5000,
      PAYOUT_FREQUENCY_DAYS: 30,
      PAYOUT_PROCESSING_TIME_HOURS: 48
    },
    TRANSACTION_TYPES: ['salary_payment', 'bonus_payment', 'gamification_reward', 'withdrawal', 'delivery_earnings'],
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: ['salary', 'bonus', 'reward', 'withdrawal', 'delivery']
    },
    TAX_SETTINGS: {
      SUPPORTED_TAX_REGIONS: ['US', 'EU', 'CA', 'AU', 'UK', 'MW', 'TZ', 'KE', 'MZ', 'NG', 'ZA', 'IN', 'BR']
    }
  },

  // Gamification Metrics
  STAFF_GAMIFICATION_CONSTANTS: {
    STAFF_ACTIONS: [
      {
        action: 'check_in_log',
        points: 10,
        name: 'Check-In Logger',
        roles: ['front_of_house'],
        walletCredit: 0.40
      },
      {
        action: 'timely_prep',
        points: 15,
        name: 'Speedy Prep Star',
        roles: ['kitchen', 'butcher', 'barista'],
        walletCredit: 0.50
      },
      {
        action: 'inventory_update',
        points: 10,
        name: 'Inventory Keeper',
        roles: ['back_of_house', 'butcher', 'stock_clerk'],
        walletCredit: 0.30
      },
      {
        action: 'waitlist_resolution',
        points: 12,
        name: 'Waitlist Resolver',
        roles: ['front_of_house'],
        walletCredit: 0.40
      },
      {
        action: 'task_completion',
        points: 10,
        name: 'Task Master',
        roles: ['front_of_house', 'back_of_house', 'kitchen', 'butcher', 'barista', 'stock_clerk', 'cashier'],
        walletCredit: 0.30
      },
      {
        action: 'performance_improvement',
        points: 20,
        name: 'Performance Booster',
        roles: ['front_of_house', 'back_of_house', 'kitchen', 'butcher', 'barista', 'stock_clerk', 'cashier'],
        walletCredit: 0.60
      },
      {
        action: 'meat_preparation',
        points: 15,
        name: 'Master Butcher',
        roles: ['butcher'],
        walletCredit: 0.50
      },
      {
        action: 'coffee_preparation',
        points: 10,
        name: 'Barista Star',
        roles: ['barista'],
        walletCredit: 0.30
      },
      {
        action: 'shelf_stocking',
        points: 10,
        name: 'Stocking Pro',
        roles: ['stock_clerk'],
        walletCredit: 0.30
      },
      {
        action: 'checkout_processing',
        points: 10,
        name: 'Checkout Champion',
        roles: ['cashier'],
        walletCredit: 0.30
      },
      {
        action: 'delivery_completion',
        points: 25,
        name: 'Delivery Completion',
        roles: ['driver'],
        walletCredit: 0.60
      },
      {
        action: 'batch_delivery',
        points: 15,
        name: 'Batch Delivery Boost',
        roles: ['driver'],
        walletCredit: 0.40
      },
      {
        action: 'timely_pickup',
        points: 15,
        name: 'Timely Pickup',
        roles: ['driver'],
        walletCredit: 0.40
      }
    ],
    POINT_EXPIRY_DAYS: 365,
    MAX_POINTS_PER_DAY: 500
  },

  // Analytics
  STAFF_ANALYTICS_CONSTANTS: {
    METRICS: [
      'task_completion_rate', 'prep_time', 'customer_satisfaction', 'inventory_accuracy',
      'checkout_speed', 'delivery_performance'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json'],
    DATA_RETENTION_DAYS: 365,
    PERFORMANCE_THRESHOLDS: {
      PREP_TIME_MINUTES: {
        restaurant: 15,
        dark_kitchen: 20,
        butcher: 5,
        grocery: 10,
        caterer: 60,
        cafe: 10,
        bakery: 10
      },
      CHECKOUT_TIME_MINUTES: 5,
      STOCKING_TIME_MINUTES: 30,
      INVENTORY_UPDATE_TIME_MINUTES: 20,
      DELIVERY_TIME_MINUTES: 45
    }
  },

  // Compliance and Certifications
  STAFF_COMPLIANCE_CONSTANTS: {
    CERTIFICATIONS: ['food_safety', 'financial_compliance', 'halal_certification', 'drivers_license', 'food_safety_driver'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 180,
    CERTIFICATION_EXPIRY_DAYS: 365
  },

  // Notifications
  STAFF_NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'task_assignment', 'shift_update', 'wallet_update', 'training_reminder',
      'delivery_assignment', 'profile_created', 'profile_updated', 'announcement'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },

  // Audit Actions
  STAFF_AUDIT_ACTIONS: [
    'staff_profile_create', 'staff_profile_update', 'staff_compliance_verify',
    'staff_profile_retrieve', 'driver_assignment'
  ],

  // Accessibility and Inclusivity
  STAFF_ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast'],
    FONT_SIZE_RANGE: { min: 12, max: 24 },
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'yo', 'zu'],
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
  },

  // Cross-Vertical Integration
  STAFF_CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mtxi', 'mevents'],
    GAMIFICATION_UNIFICATION: { POINT_CONVERSION_RATE: 1 },
    UI_CONSISTENCY: { THEME: 'default', COLOR_SCHEME: 'neutral', FONT_FAMILY: 'Roboto' }
  },

  // Operational Resilience
  STAFF_OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 50,
    SYNC_INTERVAL_MINUTES: 5,
    WEBSOCKET_HEARTBEAT_SECONDS: 30,
    MAX_OFFLINE_TRANSACTIONS: 50
  },

  // Security
  STAFF_SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    PERMISSION_LEVELS: ['read', 'write', 'admin'],
    MFA_METHODS: ['sms', 'email', 'auth_app'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    AUDIT_LOG_RETENTION_DAYS: 180
  },

  // Error Codes
  STAFF_ERROR_CODES: [
    'INVALID_STAFF_TYPE', 'STAFF_NOT_FOUND', 'PERMISSION_DENIED',
    'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED', 'COMPLIANCE_VIOLATION',
    'TASK_ASSIGNMENT_FAILED', 'OFFLINE_MODE_UNAVAILABLE', 'INVALID_EMAIL',
    'INVALID_PHONE', 'INVALID_BANK_DETAILS', 'INVALID_CERTIFICATION',
    'INCOMPLETE_PROFILE', 'MISSING_CERTIFICATIONS', 'INVALID_BRANCH',
    'INVALID_GEOFENCE', 'INVALID_CURRENCY', 'INCOMPLETE_BRANCH_PROFILE',
    'INVALID_DELIVERY_ASSIGNMENT'
  ],

  // Success Messages
  STAFF_SUCCESS_MESSAGES: [
    'Staff onboarded', 'Task completed', 'Payment processed', 'Withdrawal requested',
    'Gamification points awarded', 'Training completed', 'Delivery completed'
  ]
};