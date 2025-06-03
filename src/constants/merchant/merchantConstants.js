/**
 * merchantConstants.js
 *
 * Defines constants for the Merchant Role System, covering all merchant types (restaurant,
 * dark kitchen, butcher, grocery, caterer, cafe, bakery) and supporting interactions with
 * customers, staff, drivers, and events. Organized by functional areas: business management,
 * wallet operations, staff and driver management, gamification, compliance, events, and
 * cross-vertical integration. Supports global operations (Malawi, Tanzania, Kenya, Mozambique,
 * Nigeria, South Africa, India, Brazil) with inclusivity features (e.g., halal filters) and
 * aligns with driverConstants.js, staffConstants.js, customerConstants.js, and admin constants.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Merchant Types
  MERCHANT_TYPES: [
    'restaurant', // Dine-in, bookings, delivery
    'dark_kitchen', // Delivery-only
    'butcher', // Meat prep, pickup
    'grocery', // Inventory-focused, pickup/delivery
    'caterer', // Event-based, pre-orders
    'cafe', // Limited bookings, quick prep
    'bakery' // Takeaway/delivery, quick prep
  ],

  // Merchant Statuses
  MERCHANT_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended'],

  // Branch Configuration
  BRANCH_SETTINGS: {
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
    SUPPORTED_MAP_PROVIDERS: {
      US: 'google_maps', CN: 'baidu_maps', EU: 'openstreetmap', MW: 'google_maps', TZ: 'google_maps',
      KE: 'google_maps', MZ: 'google_maps', NG: 'google_maps', ZA: 'google_maps', IN: 'google_maps', BR: 'google_maps'
    },
    MAX_BRANCHES_PER_MERCHANT: 50,
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30
  },

  // Business Type Configuration
  BUSINESS_TYPE_SETTINGS: {
    restaurant: {
      bookings: true,
      delivery: true,
      pickup: true,
      prepTimeMinutes: 15,
      ui: 'full_service',
      tasks: ['prep_order', 'check_in', 'resolve_dispute'],
      services: ['mtables', 'munch']
    },
    dark_kitchen: {
      bookings: false,
      delivery: true,
      pickup: false,
      prepTimeMinutes: 20,
      ui: 'delivery_only',
      tasks: ['prep_order', 'packaging'],
      services: ['munch']
    },
    butcher: {
      bookings: false,
      delivery: false,
      pickup: true,
      prepTimeMinutes: 5,
      ui: 'pickup',
      tasks: ['prepare_meat', 'update_inventory'],
      services: ['munch']
    },
    grocery: {
      bookings: false,
      delivery: true,
      pickup: true,
      prepTimeMinutes: 10,
      ui: 'pickup_delivery',
      tasks: ['stock_shelves', 'update_inventory'],
      services: ['munch']
    },
    caterer: {
      bookings: true,
      delivery: true,
      pickup: false,
      prepTimeMinutes: 60,
      ui: 'event_based',
      tasks: ['prep_order', 'event_setup'],
      services: ['munch', 'mevents']
    },
    cafe: {
      bookings: true,
      delivery: true,
      pickup: true,
      prepTimeMinutes: 10,
      ui: 'quick_service',
      tasks: ['prepare_coffee', 'check_in'],
      services: ['mtables', 'munch']
    },
    bakery: {
      bookings: false,
      delivery: true,
      pickup: true,
      prepTimeMinutes: 10,
      ui: 'pickup_delivery',
      tasks: ['prep_order', 'packaging'],
      services: ['munch']
    }
  },

  // Business Management: mtables (Table Bookings)
  MTABLES_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'caterer'],
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'cancelled', 'no_show'],
    TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
    CHECK_IN_METHODS: ['qr_code', 'manual'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 1,
      MAX_BOOKING_HOURS: 4,
      CANCELLATION_WINDOW_HOURS: 24,
      DEFAULT_DEPOSIT_PERCENTAGE: 10
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 20,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 30,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 20,
      DEFAULT_TURNOVER_MINUTES: 90,
      WAITLIST_LIMIT: 50
    }
  },

  // Business Management: munch (Food Orders)
  MUNCH_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
    ORDER_STATUSES: ['pending', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'],
      MAX_ORDER_ITEMS: 50,
      MIN_ORDER_AMOUNT: 5,
      MAX_ORDER_AMOUNT: 1000,
      CANCELLATION_WINDOW_MINUTES: 10
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 15,
      MIN_DELIVERY_TIME_MINUTES: 15,
      MAX_DELIVERY_TIME_MINUTES: 90,
      BATCH_DELIVERY_LIMIT: 5
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 20,
      RESTOCK_ALERT_FREQUENCY_HOURS: 24,
      MAX_INVENTORY_ITEMS: 1000,
      BUTCHER_SPECIFIC: { MEAT_TYPES: ['beef', 'chicken', 'lamb', 'pork', 'halal'] },
      GROCERY_SPECIFIC: { CATEGORY_TYPES: ['produce', 'dairy', 'meat', 'packaged', 'household'] }
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 200,
      MAX_CATEGORIES: 20,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg'],
      MAX_MEDIA_SIZE_MB: 5
    }
  },

  // Business Management: mevents (Events)
  MEVENTS_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'caterer'],
    EVENT_TYPES: ['private', 'public', 'corporate'],
    EVENT_STATUSES: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 100,
      MIN_LEAD_TIME_HOURS: 24,
      MAX_SERVICES_PER_EVENT: 3,
      CANCELLATION_WINDOW_HOURS: 48,
      GROUP_CHAT_LIMIT: 50
    },
    GROUP_BOOKING_SETTINGS: {
      MAX_GROUP_SIZE: 50,
      MIN_DEPOSIT_PERCENTAGE: 20,
      MAX_PAYMENT_SPLITS: 10
    }
  },

  // Wallet and Financial Management
  WALLET_CONSTANTS: {
    WALLET_TYPES: ['merchant', 'customer', 'staff', 'driver'],
    PAYMENT_METHODS: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 10,
      MAX_PAYOUT_FREQUENCY_DAYS: 30,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money'],
      PAYOUT_PROCESSING_TIME_HOURS: 48
    },
    TAX_SETTINGS: {
      DEFAULT_TAX_RATE_PERCENTAGE: 10,
      SUPPORTED_TAX_REGIONS: ['US', 'EU', 'CA', 'AU', 'UK', 'MW', 'TZ', 'KE', 'MZ', 'NG', 'ZA', 'IN', 'BR']
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],
      REVENUE_CATEGORIES: ['bookings', 'orders', 'events']
    }
  },

  // Promotions and Loyalty
  PROMOTION_CONSTANTS: {
    PROMOTION_TYPES: ['discount', 'loyalty', 'referral'],
    LOYALTY_TIERS: {
      BRONZE: { name: 'Bronze', minPoints: 0, discount: 5 },
      SILVER: { name: 'Silver', minPoints: 500, discount: 10 },
      GOLD: { name: 'Gold', minPoints: 1000, discount: 15 }
    },
    REFERRAL_SETTINGS: {
      REFERRAL_BONUS_POINTS: 100,
      MAX_REFERRALS_PER_CUSTOMER: 50
    },
    DISCOUNT_SETTINGS: {
      MAX_DISCOUNT_PERCENTAGE: 50,
      MIN_DISCOUNT_AMOUNT: 1
    }
  },

  // Analytics
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'sales', 'bookings', 'orders', 'events', 'customer_retention',
      'staff_performance', 'driver_performance'
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
      DELIVERY_TIME_MINUTES: 45
    }
  },

  // Staff Management
  STAFF_CONSTANTS: {
    ROLES: [
      'front_of_house', 'back_of_house', 'kitchen', 'manager', 'butcher',
      'barista', 'stock_clerk', 'cashier'
    ],
    PERMISSIONS: [
      'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics',
      'manage_staff', 'process_payments', 'prepare_meat', 'prepare_coffee', 'stock_shelves'
    ],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 4,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6
    },
    TASK_TYPES: [
      'check_in', 'prep_order', 'update_inventory', 'resolve_dispute',
      'prepare_meat', 'prepare_coffee', 'stock_shelves', 'process_checkout'
    ]
  },

  // Driver Management
  DRIVER_CONSTANTS: {
    DRIVER_STATUSES: ['available', 'on_delivery', 'offline'],
    CERTIFICATIONS: ['drivers_license', 'food_safety'],
    DELIVERY_PERFORMANCE: {
      MIN_RATING: 4.0,
      MAX_COMPLAINTS_PER_MONTH: 3
    },
    EARNINGS_SETTINGS: {
      BASE_DELIVERY_FEE: 5,
      TIP_MINIMUM: 1,
      TIP_MAXIMUM: 50
    }
  },

  // Customer Relationship Management (CRM)
  CRM_CONSTANTS: {
    CUSTOMER_SEGMENTS: ['frequent', 'occasional', 'new', 'loyal'],
    NOTIFICATION_TYPES: ['booking_confirmation', 'order_status', 'promotion', 'event'],
    FEEDBACK_TYPES: ['review', 'complaint', 'suggestion']
  },

  // Support and Dispute Resolution
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['booking', 'order', 'delivery', 'payment', 'event', 'other'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology'],
    SUPPORT_RESPONSE_TIME_HOURS: 24
  },

  // Gamification Metrics
  GAMIFICATION_CONSTANTS: {
    CUSTOMER_ACTIONS: {
      CHECK_IN: { action: 'check_in', points: 20, name: 'Check-In Challenge', walletCredit: 0.50 },
      PRE_ORDER: { action: 'pre_order', points: 50, name: 'Pre-Order Quest', walletCredit: 1.00 },
      ORDER_FREQUENCY: { action: 'order_frequency', points: 30, name: 'Order Prep Journey', walletCredit: 0.75 },
      WALLET_USAGE: { action: 'wallet_usage', points: 15, name: 'Digital Wallet Bonus', walletCredit: 0.40 },
      LOYALTY_TIER: { action: 'loyalty_tier', points: 500, name: 'Loyalty Tier Climber', walletCredit: 10.00 },
      REFERRAL: { action: 'referral', points: 100, name: 'Referral Champion', walletCredit: 2.00 },
      EVENT_PLANNING: { action: 'event_planning', points: 100, name: 'Event Planner Badge', walletCredit: 2.00 },
      CROSS_SERVICE_USAGE: { action: 'cross_service_usage', points: 50, name: 'Cross-Service Star', walletCredit: 1.00 }
    },
    STAFF_ACTIONS: {
      CHECK_IN_LOG: { action: 'check_in_log', points: 10, name: 'Check-In Logger', walletCredit: 0.40, roles: ['front_of_house'] },
      TIMELY_PREP: { action: 'timely_prep', points: 15, name: 'Speedy Prep Star', walletCredit: 0.50, roles: ['kitchen', 'butcher', 'barista'] },
      INVENTORY_UPDATE: { action: 'inventory_update', points: 10, name: 'Inventory Keeper', walletCredit: 0.30, roles: ['back_of_house', 'butcher', 'stock_clerk'] },
      TASK_COMPLETION: { action: 'task_completion', points: 10, name: 'Task Master', walletCredit: 0.30, roles: ['front_of_house', 'back_of_house', 'kitchen', 'butcher', 'barista', 'stock_clerk', 'cashier'] },
      MEAT_PREPARATION: { action: 'meat_preparation', points: 15, name: 'Master Butcher', walletCredit: 0.50, roles: ['butcher'] },
      COFFEE_PREPARATION: { action: 'coffee_preparation', points: 10, name: 'Barista Star', walletCredit: 0.30, roles: ['barista'] },
      SHELF_STOCKING: { action: 'shelf_stocking', points: 10, name: 'Stocking Pro', walletCredit: 0.30, roles: ['stock_clerk'] },
      CHECKOUT_PROCESSING: { action: 'checkout_processing', points: 10, name: 'Checkout Champion', walletCredit: 0.30, roles: ['cashier'] }
    },
    DRIVER_ACTIONS: {
      DELIVERY_COMPLETION: { action: 'delivery_completion', points: 25, name: 'Delivery Completion Quest', walletCredit: 0.60 },
      BATCH_DELIVERY: { action: 'batch_delivery', points: 15, name: 'Batch Delivery Boost', walletCredit: 0.40 },
      TIMELY_PICKUP: { action: 'timely_pickup', points: 15, name: 'Timely Pickup Reward', walletCredit: 0.40 }
    },
    POINT_EXPIRY_DAYS: 365,
    MAX_POINTS_PER_DAY: 1000
  },

  // Compliance and Licensing
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'halal_certification'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 180,
    CERTIFICATION_EXPIRY_DAYS: 365
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    DELIVERY_METHODS: ['push', 'email', 'sms'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },

  // Accessibility and Inclusivity
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast'],
    FONT_SIZE_RANGE: { min: 12, max: 24 },
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
  },

  // Cross-Vertical Integration
  CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mevents'],
    LOYALTY_UNIFICATION: { POINT_CONVERSION_RATE: 1 },
    UI_CONSISTENCY: { THEME: 'default', COLOR_SCHEME: 'neutral', FONT_FAMILY: 'Roboto' }
  },

  // Operational Resilience
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 100,
    SYNC_INTERVAL_MINUTES: 5,
    WEBSOCKET_HEARTBEAT_SECONDS: 30,
    MAX_OFFLINE_TRANSACTIONS: 100
  },

  // Security
  SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    PERMISSION_LEVELS: ['read', 'write', 'admin'],
    AUDIT_LOG_RETENTION_DAYS: 180,
    MFA_METHODS: ['sms', 'email', 'auth_app'],
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30
  },

  // Error Codes
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'MERCHANT_NOT_FOUND', 'PERMISSION_DENIED',
    'PAYMENT_FAILED', 'WALLET_INSUFFICIENT_FUNDS', 'COMPLIANCE_VIOLATION',
    'OFFLINE_MODE_UNAVAILABLE'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'Merchant created', 'Booking confirmed', 'Order processed', 'Event created',
    'Payment completed', 'Payout processed', 'Gamification points awarded'
  ]
};