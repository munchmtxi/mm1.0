'use strict';

/**
 * cafeConstants.js
 *
 * Defines constants for the Cafe merchant type, supporting limited table bookings, quick-service
 * orders, and delivery with cafe-specific beverage and food types. Integrates wallet operations,
 * staff management, analytics, notifications, and compliance. Supports 15 countries with localization
 * handled by localizationConstants.js and aligns with driverConstants.js, staffConstants.js,
 * customerConstants.js, admin constants, and merchantConstants.js.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'cafe',
  BUSINESS_SETTINGS: {
    bookings: true,
    delivery: true,
    pickup: true,
    prepTimeMinutes: 8,
    ui: 'quick_service',
    tasks: ['prepare_beverage', 'prepare_food', 'check_in', 'customer_support', 'monitor_parking'],
    services: ['mtables', 'munch', 'mpark'],
    CAFE_CONFIG: {
      BEVERAGE_TYPES: ['coffee', 'tea', 'juice', 'smoothie', 'soft_drink', 'specialty_drink'],
      FOOD_TYPES: ['pastry', 'sandwich', 'salad', 'snack'],
      DIETARY_SPECIALTIES: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_sugar', 'organic'],
      AMBIANCE_TYPES: ['cozy', 'modern', 'outdoor', 'work_friendly'],
      QUICK_SERVICE_SETTINGS: {
        MAX_ORDER_PREP_MINUTES: 10,
        MIN_ORDER_LEAD_TIME_MINUTES: 5,
        MAX_DAILY_ORDERS: 1000
      }
    }
  },
  BRANCH_SETTINGS: {
    MAX_BRANCHES: 100,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60
  },
  MTABLES_CONSTANTS: {
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
    CHECK_IN_METHODS: ['qr_code', 'manual', 'nfc'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 0.5,
      MAX_BOOKING_HOURS: 3,
      CANCELLATION_WINDOW_HOURS: 12,
      DEFAULT_DEPOSIT_PERCENTAGE: 5
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 15,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 10,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_sugar', 'organic']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 15,
      DEFAULT_TURNOVER_MINUTES: 45,
      WAITLIST_LIMIT: 30
    }
  },
  MUNCH_CONSTANTS: {
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_sugar', 'organic'],
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 2,
      MAX_ORDER_AMOUNT: 1000,
      CANCELLATION_WINDOW_MINUTES: 5,
      AI_RECOMMENDATIONS: ['personalized_menu', 'dietary_suggestions', 'trending_items']
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 25,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 120,
      BATCH_DELIVERY_LIMIT: 5,
      AI_ROUTE_OPTIMIZATION: true,
      REAL_TIME_TRACKING: true
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 15,
      RESTOCK_ALERT_FREQUENCY_HOURS: 12,
      MAX_INVENTORY_ITEMS: 1000,
      CATEGORY_TYPES: ['beverage', 'pastry', 'sandwich', 'salad', 'snack']
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 200,
      MAX_CATEGORIES: 20,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'webp'],
      MAX_MEDIA_SIZE_MB: 10,
      MENU_SECTIONS: ['beverages', 'food', 'specials']
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
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      PAYOUT_PROCESSING_TIME_HOURS: 24
    }
  },
  STAFF_CONSTANTS: {
    ROLES: ['barista', 'manager', 'front_of_house', 'customer_service', 'car_park_operative'],
    PERMISSIONS: [
      'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics', 'manage_staff',
      'prepare_beverage', 'prepare_food', 'process_payments', 'handle_complaints', 'monitor_parking', 'assist_parking'
    ],
    TASK_TYPES: ['prepare_beverage', 'prepare_food', 'check_in', 'customer_support', 'parking_check_in', 'parking_assist'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      AI_SHIFT_SCHEDULING: true
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_volume', 'revenue', 'inventory_turnover', 'booking_frequency', 'customer_retention', 'parking_compliance'],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['menu_items', 'beverage_types', 'customer_preferences', 'parking_usage']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'booking_confirmation', 'order_confirmation', 'low_stock_alert', 'restock_alert', 'payment_confirmation',
      'support_response', 'social_media_post', 'parking_alert'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high', 'urgent'],
    MAX_NOTIFICATIONS_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'braille_support'],
    FONT_SIZE_RANGE: { min: 10, max: 28 }
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'halal_certification', 'kosher_certification'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: ['booking_confirmed', 'order_processed', 'inventory_updated', 'payment_processed', 'parking_booking_confirmed']
  },
  GAMIFICATION_CONSTANTS: {
    GAMIFICATION_ACTIONS: [
      { action: 'booking_confirmed', name: 'Booking Confirmed', points: 10 },
      { action: 'order_processed', name: 'Order Processed', points: 10 },
      { action: 'inventory_updated', name: 'Inventory Updated', points: 5 },
      { action: 'customer_review_received', name: 'Customer Review Received', points: 10 },
      { action: 'social_post_shared', name: 'Social Post Shared', points: 8 },
      { action: 'parking_booking_confirmed', name: 'Parking Booking Confirmed', points: 10 }
    ],
    GAMIFICATION_SETTINGS: {
      MAX_DAILY_ACTIONS: 50,
      POINTS_EXPIRY_DAYS: 365,
      LEADERBOARD_TYPES: ['global', 'regional', 'merchant_specific'],
      REWARD_CATEGORIES: ['cash_bonus', 'crypto_rewards', 'free_services', 'priority_orders'],
      AI_PERSONALIZATION: true
    }
  },
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_BOOKING_TYPE', 'INVALID_DIETARY_FILTER',
    'MAX_BOOKINGS_EXCEEDED', 'INVENTORY_LIMIT_EXCEEDED', 'INVALID_PARKING_ASSIGNMENT'
  ],
  SUCCESS_MESSAGES: [
    'booking_confirmed', 'order_processed', 'payment_completed', 'inventory_updated', 'social_post_shared', 'parking_booking_confirmed'
  ]
};