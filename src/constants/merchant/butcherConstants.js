'use strict';

/**
 * butcherConstants.js
 *
 * Defines constants for the Butcher merchant type, supporting pickup and custom orders with
 * butcher-specific meat cuts, preparation types, and sourcing details. Integrates wallet operations,
 * staff management, analytics, notifications, and compliance. Supports 15 countries with localization
 * handled by localizationConstants.js and aligns with driverConstants.js, staffConstants.js,
 * customerConstants.js, admin constants, and merchantConstants.js.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'butcher',
  BUSINESS_SETTINGS: {
    bookings: false,
    delivery: false,
    pickup: true,
    prepTimeMinutes: 5,
    ui: 'pickup',
    tasks: ['prepare_meat', 'update_inventory', 'customize_order', 'package_order', 'customer_support'],
    services: ['munch'],
    BUTCHER_CONFIG: {
      MEAT_TYPES: ['beef', 'chicken', 'lamb', 'pork', 'goat', 'game'],
      PREPARATION_TYPES: ['raw', 'trimmed', 'marinated', 'ground', 'sausage', 'cured', 'smoked'],
      DIETARY_SPECIALTIES: ['halal', 'organic', 'grass_fed', 'free_range'],
      CUSTOM_ORDER_SETTINGS: {
        ALLOWED_TYPES: ['beef', 'chicken', 'lamb', 'pork', 'goat', 'game'],
        MIN_LEAD_TIME_HOURS: 6,
        MAX_CUSTOM_ORDERS_PER_DAY: 50,
        CUSTOMIZATION_FIELDS: ['cut_type', 'weight', 'preparation_type', 'dietary_requirements', 'packaging'],
        AI_CUSTOMIZATION_SUGGESTIONS: true
      },
      SOURCING_DETAILS: {
        SOURCE_TYPES: ['local', 'regional', 'imported'],
        CERTIFICATIONS: ['halal', 'organic', 'grass_fed', 'free_range'],
        TRACEABILITY_FIELDS: ['farm_name', 'region', 'certification_id']
      },
      INVENTORY_LIMITS: {
        MAX_DAILY_PRODUCTION: 2000,
        MAX_SPECIALTY_ITEMS: 500
      }
    }
  },
  BRANCH_SETTINGS: {
    MAX_BRANCHES: 100,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60
  },
  MUNCH_CONSTANTS: {
    ORDER_TYPES: ['takeaway', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['halal', 'organic', 'grass_fed', 'free_range'],
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 2,
      MAX_ORDER_AMOUNT: 2000,
      CANCELLATION_WINDOW_MINUTES: 5,
      CUSTOM_ORDER_MIN_LEAD_TIME_HOURS: 6,
      AI_RECOMMENDATIONS: ['cut_suggestions', 'preparation_suggestions']
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 15,
      RESTOCK_ALERT_FREQUENCY_HOURS: 12,
      MAX_INVENTORY_ITEMS: 2000,
      MEAT_CATEGORIES: ['beef', 'chicken', 'lamb', 'pork', 'goat', 'game'],
      PREPARATION_CATEGORIES: ['raw', 'trimmed', 'marinated', 'ground', 'sausage', 'cured', 'smoked']
    },
    MENU_SETTINGS: {
      MAX_MENU_ITEMS: 300,
      MAX_CATEGORIES: 30,
      ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'webp'],
      MAX_MEDIA_SIZE_MB: 10,
      MENU_SECTIONS: ['standard_cuts', 'specialty_cuts', 'custom_orders']
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
    ROLES: ['butcher', 'manager', 'packager', 'customer_service'],
    PERMISSIONS: [
      'process_orders', 'update_inventory', 'view_analytics', 'manage_staff', 'prepare_meat',
      'customize_order', 'process_payments', 'handle_complaints'
    ],
    TASK_TYPES: ['prepare_meat', 'update_inventory', 'customize_order', 'package_order', 'customer_support'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      AI_SHIFT_SCHEDULING: true
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_volume', 'revenue', 'inventory_turnover', 'customer_retention', 'dietary_filter_usage'],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['meat_types', 'preparation_types', 'customer_preferences']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'order_confirmation', 'low_stock_alert', 'restock_alert', 'payment_confirmation', 'custom_order_received',
      'support_response', 'social_media_post'
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
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'halal_certification'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: ['order_processed', 'inventory_updated', 'payment_processed', 'custom_order_confirmed']
  },
  GAMIFICATION_CONSTANTS: {
    GAMIFICATION_ACTIONS: [
      { action: 'order_processed', name: 'Order Processed', points: 10 },
      { action: 'custom_order_completed', name: 'Custom Order Completed', points: 15 },
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
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_ORDER_TYPE', 'INVALID_DIETARY_FILTER',
    'MAX_CUSTOM_ORDERS_EXCEEDED', 'INVENTORY_LIMIT_EXCEEDED'
  ],
  SUCCESS_MESSAGES: [
    'order_processed', 'payment_completed', 'custom_order_confirmed', 'inventory_updated', 'social_post_shared'
  ]
};