'use strict';

/**
 * catererConstants.js
 *
 * Defines constants for the Caterer merchant type, supporting event-based pre-orders and delivery
 * with caterer-specific event menus and service types. Integrates wallet operations, staff management,
 * analytics, notifications, and compliance. Supports 15 countries with localization handled by
 * localizationConstants.js and aligns with driverConstants.js, staffConstants.js, customerConstants.js,
 * admin constants, and merchantConstants.js.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'caterer',
  BUSINESS_SETTINGS: {
    bookings: true,
    delivery: true,
    pickup: false,
    prepTimeMinutes: 30,
    ui: 'event_based',
    tasks: ['prep_order', 'event_setup', 'client_consultation', 'customer_support'],
    services: ['munch', 'mevents'],
    CATERER_CONFIG: {
      EVENT_MENU_TYPES: ['buffet', 'plated', 'family_style', 'canape', 'food_station'],
      SERVICE_TYPES: ['full_service', 'drop_off'],
      DIETARY_SPECIALTIES: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
      EVENT_SCALE: ['small', 'medium', 'large'],
      CLIENT_CONSULTATION_SETTINGS: {
        MIN_LEAD_TIME_DAYS: 3,
        MAX_CONSULTATIONS_PER_DAY: 10,
        CONSULTATION_FIELDS: ['menu_preferences', 'guest_count', 'event_type', 'dietary_needs', 'venue_details'],
        AI_PLANNING_TOOLS: ['menu_optimizer', 'guest_count_estimator', 'dietary_suggestions']
      }
    }
  },
  BRANCH_SETTINGS: {
    MAX_BRANCHES: 100,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60
  },
  MUNCH_CONSTANTS: {
    ORDER_TYPES: ['delivery', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 50,
      MAX_ORDER_AMOUNT: 10000,
      CANCELLATION_WINDOW_MINUTES: 30,
      MIN_PRE_ORDER_LEAD_TIME_HOURS: 12,
      AI_RECOMMENDATIONS: ['menu_suggestions', 'dietary_suggestions']
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
      CATEGORY_TYPES: ['appetizers', 'mains', 'sides', 'desserts', 'beverages']
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 300,
      MAX_CATEGORIES: 30,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'webp'],
      MAX_MEDIA_SIZE_MB: 10,
      MENU_SECTIONS: ['event_menus', 'custom_menus']
    }
  },
  MEVENTS_CONSTANTS: {
    EVENT_TYPES: ['birthday', 'anniversary', 'corporate', 'wedding', 'social', 'conference'],
    EVENT_STATUSES: ['draft', 'confirmed', 'active', 'completed', 'cancelled'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 1000,
      MIN_LEAD_TIME_HOURS: 24,
      MAX_SERVICES_PER_EVENT: 10,
      CANCELLATION_WINDOW_HOURS: 48,
      GROUP_CHAT_LIMIT: 100,
      AI_PLANNING_TOOLS: ['budget_optimizer', 'vendor_recommendations', 'schedule_generator'],
      SOCIAL_SHARING: ['event_invite', 'post_event', 'live_updates']
    },
    GROUP_BOOKING_SETTINGS: {
      MAX_GROUP_SIZE: 1000,
      MIN_DEPOSIT_PERCENTAGE: 10,
      MAX_PAYMENT_SPLITS: 50,
      BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized', 'percentage', 'sponsor_contribution']
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
    ROLES: ['chef', 'manager', 'event_staff', 'consultant', 'customer_service', 'driver'],
    PERMISSIONS: [
      'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'event_setup',
      'client_consultation', 'process_payments', 'handle_complaints', 'process_deliveries'
    ],
    TASK_TYPES: ['prep_order', 'event_setup', 'client_consultation', 'customer_support', 'delivery_handover'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      AI_SHIFT_SCHEDULING: true
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_volume', 'revenue', 'inventory_turnover', 'event_frequency', 'customer_retention', 'delivery_performance'],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['menu_items', 'event_types', 'customer_preferences']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'order_confirmation', 'event_confirmation', 'low_stock_alert', 'restock_alert', 'payment_confirmation',
      'consultation_scheduled', 'support_response', 'social_media_post', 'delivery_assignment'
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
    AUDIT_TYPES: ['order_processed', 'event_confirmed', 'inventory_updated', 'payment_processed']
  },
  GAMIFICATION_CONSTANTS: {
    GAMIFICATION_ACTIONS: [
      { action: 'order_processed', name: 'Order Processed', points: 10 },
      { action: 'event_confirmed', name: 'Event Confirmed', points: 20 },
      { action: 'inventory_updated', name: 'Inventory Updated', points: 5 },
      { action: 'customer_review_received', name: 'Customer Review Received', points: 10 },
      { action: 'social_post_shared', name: 'Social Post Shared', points: 8 }
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
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_EVENT_TYPE', 'INVALID_DIETARY_FILTER',
    'MAX_EVENTS_EXCEEDED', 'INVENTORY_LIMIT_EXCEEDED'
  ],
  SUCCESS_MESSAGES: [
    'order_processed', 'event_confirmed', 'payment_completed', 'consultation_scheduled', 'inventory_updated', 'social_post_shared', 'delivery_completed'
  ]
};