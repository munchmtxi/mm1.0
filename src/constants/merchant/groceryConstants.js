'use strict';

/**
 * groceryConstants.js
 *
 * Defines constants for the Grocery merchant type, supporting inventory-focused pickup and
 * delivery orders with grocery-specific product categories and bulk order options. Integrates
 * wallet operations, staff management, analytics, notifications, and compliance. Supports 15
 * countries with localization handled by localizationConstants.js and aligns with driverConstants.js,
 * staffConstants.js, customerConstants.js, admin constants, and merchantConstants.js.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'grocery',
  BUSINESS_SETTINGS: {
    bookings: false,
    delivery: true,
    pickup: true,
    prepTimeMinutes: 8,
    ui: 'pickup_delivery',
    tasks: ['stock_shelves', 'pick_order', 'update_inventory', 'customer_support', 'monitor_parking'],
    services: ['munch', 'mpark'],
    GROCERY_CONFIG: {
      PRODUCT_CATEGORIES: ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'packaged', 'household', 'beverages', 'personal_care'],
      DIETARY_SPECIALTIES: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'organic'],
      BULK_ORDER_SETTINGS: {
        MAX_BULK_ITEMS: 200,
        MIN_BULK_ORDER_AMOUNT: 20,
        DISCOUNT_THRESHOLD_PERCENTAGE: 15
      },
      SUBSTITUTION_POLICIES: {
        ALLOW_SUBSTITUTIONS: true,
        SUBSTITUTION_TYPES: ['same_brand', 'similar_product', 'none'],
        CUSTOMER_APPROVAL_REQUIRED: true,
        AI_SUBSTITUTION_SUGGESTIONS: true
      }
    }
  },
  BRANCH_SETTINGS: {
    MAX_BRANCHES: 100,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60
  },
  MUNCH_CONSTANTS: {
    ORDER_TYPES: ['takeaway', 'delivery', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'organic'],
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 2,
      MAX_ORDER_AMOUNT: 2000,
      CANCELLATION_WINDOW_MINUTES: 5,
      AI_RECOMMENDATIONS: ['product_suggestions', 'dietary_suggestions', 'trending_items']
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 25,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 120,
      BATCH_DELIVERY_LIMIT: 7,
      AI_ROUTE_OPTIMIZATION: true,
      REAL_TIME_TRACKING: true
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 15,
      RESTOCK_ALERT_FREQUENCY_HOURS: 12,
      MAX_INVENTORY_ITEMS: 2000,
      CATEGORY_TYPES: ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'packaged', 'household', 'beverages', 'personal_care']
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 300,
      MAX_CATEGORIES: 30,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'webp'],
      MAX_MEDIA_SIZE_MB: 10,
      MENU_SECTIONS: ['essentials', 'specialty', 'bulk']
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
    ROLES: ['stock_clerk', 'manager', 'picker', 'cashier', 'customer_service', 'car_park_operative', 'front_of_house'],
    PERMISSIONS: [
      'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'stock_shelves',
      'pick_order', 'process_payments', 'handle_complaints', 'monitor_parking', 'assist_parking'
    ],
    TASK_TYPES: ['stock_shelves', 'pick_order', 'update_inventory', 'process_checkout', 'customer_support', 'parking_check_in', 'parking_assist'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      AI_SHIFT_SCHEDULING: true
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_volume', 'revenue', 'inventory_turnover', 'customer_retention', 'substitution_rate', 'parking_compliance'],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['product_categories', 'bulk_items', 'customer_preferences', 'parking_usage']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'order_confirmation', 'low_stock_alert', 'restock_alert', 'payment_confirmation', 'substitution_approved',
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
    AUDIT_TYPES: ['order_processed', 'inventory_updated', 'payment_processed', 'substitution_processed', 'parking_booking_confirmed']
  },
  GAMIFICATION_CONSTANTS: {
    GAMIFICATION_ACTIONS: [
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
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_DIETARY_FILTER', 'INVENTORY_LIMIT_EXCEEDED',
    'INVALID_SUBSTITUTION', 'INVALID_PARKING_ASSIGNMENT'
  ],
  SUCCESS_MESSAGES: [
    'order_processed', 'payment_completed', 'inventory_updated', 'substitution_processed', 'social_post_shared', 'parking_booking_confirmed'
  ]
};