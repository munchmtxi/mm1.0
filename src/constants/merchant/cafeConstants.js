/**
 * cafeConstants.js
 *
 * Defines constants for the Cafe merchant type, supporting limited table bookings and quick
 * prep food orders. Includes wallet operations, staff management, gamification, and compliance.
 * Supports global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa,
 * India, Brazil) with inclusivity features (e.g., halal filters) and aligns with
 * driverConstants.js, staffConstants.js, customerConstants.js, and admin constants.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Merchant Type
  MERCHANT_TYPE: 'cafe',

  // Business Configuration
  BUSINESS_SETTINGS: {
    bookings: true,
    delivery: true,
    pickup: true,
    prepTimeMinutes: 10,
    ui: 'quick_service',
    tasks: ['prepare_coffee', 'check_in'],
    services: ['mtables', 'munch']
  },

  // Branch Configuration
  BRANCH_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'sw', 'ny', 'pt', 'hi', 'yo', 'zu'],
    SUPPORTED_CITIES: {
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
    MAX_BRANCHES: 50,
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30
  },

  // Table Bookings (mtables)
  MTABLES_CONSTANTS: {
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'cancelled', 'no_show'],
    TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
    CHECK_IN_METHODS: ['qr_code', 'manual'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 1,
      MAX_BOOKING_HOURS: 2,
      CANCELLATION_WINDOW_HOURS: 24,
      DEFAULT_DEPOSIT_PERCENTAGE: 10
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 10,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 15,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 10,
      DEFAULT_TURNOVER_MINUTES: 60,
      WAITLIST_LIMIT: 20
    }
  },

  // Food Orders (munch)
  MUNCH_CONSTANTS: {
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
    ORDER_STATUSES: ['pending', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'],
      MAX_ORDER_ITEMS: 50,
      MIN_ORDER_AMOUNT: 5,
      MAX_ORDER_AMOUNT: 500,
      CANCELLATION_WINDOW_MINUTES: 10
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 10,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 60,
      BATCH_DELIVERY_LIMIT: 3
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 20,
      RESTOCK_ALERT_FREQUENCY_HOURS: 24,
      MAX_INVENTORY_ITEMS: 500
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 100,
      MAX_CATEGORIES: 10,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg'],
      MAX_MEDIA_SIZE_MB: 5
    }
  },

  // Wallet Operations
  WALLET_CONSTANTS: {
    PAYMENT_METHODS: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 10,
      MAX_PAYOUT_FREQUENCY_DAYS: 30,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money']
    }
  },

  // Staff Management
  STAFF_CONSTANTS: {
    ROLES: ['barista', 'manager', 'front_of_house'],
    PERMISSIONS: ['manage_bookings', 'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'prepare_coffee', 'process_payments'],
    TASK_TYPES: ['prepare_coffee', 'check_in']
  },

  // Gamification
  GAMIFICATION_CONSTANTS: {
    STAFF_ACTIONS: {
      CHECK_IN_LOG: { action: 'check_in_log', points: 10, roles: ['front_of_house'] },
      TIMELY_PREP: { action: 'timely_prep', points: 15, roles: ['barista'] },
      COFFEE_PREPARATION: { action: 'coffee_preparation', points: 10, roles: ['barista'] },
      TASK_COMPLETION: { action: 'task_completion', points: 10, roles: ['barista', 'front_of_house'] }
    },
    POINT_EXPIRY_DAYS: 365,
    MAX_POINTS_PER_DAY: 1000
  },

  // Compliance
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'halal_certification'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired']
  },

  // Error Codes
  ERROR_CODES: ['INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED'],

  // Success Messages
  SUCCESS_MESSAGES: ['Booking confirmed', 'Order processed', 'Payment completed']
};