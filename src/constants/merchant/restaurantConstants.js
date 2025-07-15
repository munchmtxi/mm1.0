'use strict';

/**
 * restaurantConstants.js
 *
 * Defines constants for the Restaurant merchant type, supporting table bookings, delivery, and
 * event-based orders with restaurant-specific dining experiences and menu styles. Integrates wallet
 * operations, staff management, analytics, notifications, and compliance. Supports 15 countries with
 * localization handled by localizationConstants.js and aligns with driverConstants.js, staffConstants.js,
 * customerConstants.js, admin constants, and merchantConstants.js.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'restaurant',
  BUSINESS_SETTINGS: {
    bookings: true,
    delivery: true,
    pickup: true,
    prepTimeMinutes: 8,
    ui: 'full_service',
    tasks: ['prep_order', 'check_in', 'serve_table', 'resolve_dispute', 'customer_support', 'event_setup', 'monitor_parking'],
    services: ['mtables', 'munch', 'mevents', 'mpark'],
    RESTAURANT_CONFIG: {
      DINING_EXPERIENCES: ['casual', 'fine_dining', 'family', 'outdoor', 'bar', 'pop_up'],
      MENU_STYLES: ['a_la_carte', 'prix_fixe', 'buffet', 'tasting_menu', 'family_style'],
      DIETARY_SPECIALTIES: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic', 'paleo'],
      AMBIANCE_TYPES: ['romantic', 'modern', 'rustic', 'lively', 'cozy'],
      SERVICE_SETTINGS: {
        MAX_DAILY_BOOKINGS: 500,
        MIN_PRE_ORDER_LEAD_TIME_MINUTES: 10,
        MAX_COURSES_PER_MENU: 12,
        AI_MENU_SUGGESTIONS: true
      }
    }
  },
  BRANCH_SETTINGS: {
    MAX_BRANCHES: 100,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: {
      ENABLED: true,
      METHODS: ['sms', 'email', 'authenticator_app']
    }
  },
  MTABLES_CONSTANTS: {
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
    CHECK_IN_METHODS: ['qr_code', 'manual', 'nfc', 'license_plate'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 0.5,
      MAX_BOOKING_HOURS: 6,
      CANCELLATION_WINDOW_HOURS: 6,
      DEFAULT_DEPOSIT_PERCENTAGE: 5
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 50,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 10,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic', 'paleo']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 50,
      DEFAULT_TURNOVER_MINUTES: 45,
      WAITLIST_LIMIT: 100
    }
  },
  MUNCH_CONSTANTS: {
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic', 'paleo'],
      MAX_ORDER_ITEMS: 150,
      MIN_ORDER_AMOUNT: 2,
      MAX_ORDER_AMOUNT: 5000,
      CANCELLATION_WINDOW_MINUTES: 3,
      AI_RECOMMENDATIONS: ['personalized_menu', 'dietary_suggestions', 'trending_items', 'wine_pairing']
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 30,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 120,
      BATCH_DELIVERY_LIMIT: 10,
      AI_ROUTE_OPTIMIZATION: true,
      REAL_TIME_TRACKING: true
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 10,
      RESTOCK_ALERT_FREQUENCY_HOURS: 12,
      MAX_INVENTORY_ITEMS: 3000,
      CATEGORY_TYPES: ['appetizers', 'mains', 'sides', 'desserts', 'beverages', 'specials']
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 500,
      MAX_CATEGORIES: 50,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'webp', 'mp4'],
      MAX_MEDIA_SIZE_MB: 15,
      MENU_SECTIONS: ['a_la_carte', 'prix_fixe', 'tasting_menu', 'specials', 'seasonal']
    }
  },
  MEVENTS_CONSTANTS: {
    EVENT_TYPES: ['birthday', 'anniversary', 'corporate', 'wedding', 'social', 'conference', 'private_dining'],
    EVENT_STATUSES: ['draft', 'confirmed', 'active', 'completed', 'cancelled'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 1000,
      MIN_LEAD_TIME_HOURS: 12,
      MAX_SERVICES_PER_EVENT: 15,
      CANCELLATION_WINDOW_HOURS: 24,
      GROUP_CHAT_LIMIT: 200,
      AI_PLANNING_TOOLS: ['budget_optimizer', 'vendor_recommendations', 'schedule_generator', 'menu_planner'],
      SOCIAL_SHARING: ['event_invite', 'post_event', 'live_updates', 'photo_sharing']
    },
    GROUP_BOOKING_SETTINGS: {
      MAX_GROUP_SIZE: 1000,
      MIN_DEPOSIT_PERCENTAGE: 5,
      MAX_PAYMENT_SPLITS: 100,
      BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized', 'percentage', 'sponsor_contribution']
    }
  },
  MPARK_CONSTANTS: {
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    SPACE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance', 'disabled'],
    BOOKING_TYPES: ['hourly', 'daily'],
    CHECK_IN_METHODS: ['qr_code', 'license_plate', 'manual', 'nfc'],
    BOOKING_POLICIES: {
      MIN_BOOKING_MINUTES: 15,
      MAX_BOOKING_DAYS: 1,
      CANCELLATION_WINDOW_HOURS: 1,
      DEFAULT_DEPOSIT_PERCENTAGE: 5
    },
    SPACE_MANAGEMENT: {
      MIN_SPACE_CAPACITY: 1,
      MAX_SPACE_CAPACITY: 1,
      DEFAULT_TURNOVER_MINUTES: 10,
      WAITLIST_LIMIT: 20
    },
    PRICING_SETTINGS: {
      MIN_HOURLY_RATE: 0.5,
      MAX_HOURLY_RATE: 50,
      MIN_DAILY_RATE: 2,
      MAX_DAILY_RATE: 200,
      DISCOUNT_TYPES: ['early_bird', 'loyalty'],
      MAX_DISCOUNT_PERCENTAGE: 50
    }
  },
  WALLET_CONSTANTS: {
    PAYMENT_METHODS: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 15000,
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT', 'BNB'],
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_ENABLED: true
    },
    TRANSACTION_LIMITS: {
      MAX_DAILY_TRANSACTIONS: 2000,
      MAX_TRANSACTION_AMOUNT: 10000
    }
  },
  STAFF_CONSTANTS: {
    ROLES: ['chef', 'server', 'manager', 'host', 'bartender', 'customer_service', 'car_park_operative', 'front_of_house'],
    PERMISSIONS: [
      'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics', 'manage_staff',
      'serve_table', 'event_setup', 'process_payments', 'handle_complaints', 'monitor_parking', 'assist_parking'
    ],
    TASK_TYPES: ['prep_order', 'check_in', 'serve_table', 'event_setup', 'customer_support', 'bartending', 'parking_check_in', 'parking_assist'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      AI_SHIFT_SCHEDULING: true
    },
    TRAINING_MODULES: [
      'order_processing', 'table_management', 'event_management', 'customer_service', 'compliance', 'safety', 'parking_operations'
    ]
  },
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'order_volume', 'revenue', 'inventory_turnover', 'booking_frequency', 'event_frequency',
      'customer_retention', 'table_turnover_rate', 'menu_item_popularity', 'parking_compliance'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['menu_items', 'dining_experiences', 'customer_preferences', 'staff_efficiency', 'parking_usage']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'booking_confirmation', 'order_confirmation', 'event_confirmation', 'low_stock_alert',
      'restock_alert', 'payment_confirmation', 'support_response', 'social_media_post', 'parking_alert'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high', 'urgent'],
    MAX_NOTIFICATIONS_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30,
    CUSTOMER_NOTIFICATION_PREFERENCES: true
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: [
      'screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'braille_support'
    ],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    LANGUAGE_ACCESSIBILITY: true
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: [
      'food_safety', 'health_permit', 'business_license', 'halal_certification',
      'kosher_certification', 'alcohol_license'
    ],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired', 'suspended'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'booking_confirmed', 'order_processed', 'event_confirmed', 'inventory_updated',
      'payment_processed', 'parking_booking_confirmed'
    ]
  },
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_BOOKING_TYPE',
    'INVALID_EVENT_TYPE', 'INVALID_DIETARY_FILTER', 'MAX_BOOKINGS_EXCEEDED',
    'INVENTORY_LIMIT_EXCEEDED', 'INVALID_PARKING_ASSIGNMENT'
  ],
  SUCCESS_MESSAGES: [
    'booking_confirmed', 'order_processed', 'event_confirmed', 'payment_completed',
    'inventory_updated', 'social_post_shared', 'tasting_menu_served', 'parking_booking_confirmed'
  ]
};