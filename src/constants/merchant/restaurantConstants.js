/**
 * restaurantConstants.js
 *
 * Defines constants for the Restaurant merchant type, supporting dine-in, table bookings,
 * food orders, and event management. Includes wallet operations, staff management,
 * gamification, and compliance. Supports global operations (Malawi, Tanzania, Kenya,
 * Mozambique, Nigeria, South Africa, India, Brazil) with inclusivity features (e.g., halal
 * filters) and aligns with driverConstants.js, staffConstants.js, customerConstants.js,
 * and admin constants.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Merchant Type
  MERCHANT_TYPE: 'restaurant',

  // Business Configuration
  BUSINESS_SETTINGS: {
    bookings: true,
    delivery: true,
    pickup: true,
    prepTimeMinutes: 15,
    ui: 'full_service',
    tasks: ['prep_order', 'check_in', 'resolve_dispute'],
    services: ['mtables', 'munch', 'mevents']
  },

  // Branch Configuration
  BRANCH_SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'yo', 'zu'],
    SUPPORTED_CITIES: {
      US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami'],
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

  // Food Orders (munch)
  MUNCH_CONSTANTS: {
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
      MAX_INVENTORY_ITEMS: 1000
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 200,
      MAX_CATEGORIES: 20,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg'],
      MAX_MEDIA_SIZE_MB: 5
    }
  },

  // Events (mevents)
  MEVENTS_CONSTANTS: {
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
    ROLES: ['front_of_house', 'back_of_house', 'kitchen', 'manager'],
    PERMISSIONS: ['manage_bookings', 'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'process_payments'],
    TASK_TYPES: ['check_in', 'prep_order', 'update_inventory', 'resolve_dispute']
  },

  // Gamification
  GAMIFICATION_CONSTANTS: {
    STAFF_ACTIONS: {
      CHECK_IN_LOG: { action: 'check_in_log', points: 10, roles: ['front_of_house'] },
      TIMELY_PREP: { action: 'timely_prep', points: 15, roles: ['kitchen'] },
      INVENTORY_UPDATE: { action: 'inventory_update', points: 10, roles: ['back_of_house'] },
      TASK_COMPLETION: { action: 'task_completion', points: 10, roles: ['front_of_house', 'back_of_house', 'kitchen'] }
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
  SUCCESS_MESSAGES: ['Booking confirmed', 'Order processed', 'Event created', 'Payment completed']
};