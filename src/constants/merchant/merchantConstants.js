'use strict';

/**
 * merchantConstants.js
 *
 * Unified constants for merchants, combining shared, wallet, compliance,
 * notification, accessibility, analytics, social media, support, and API settings.
 * Last Updated: July 21, 2025
 */

module.exports = {
  // Supported merchant types
  MERCHANT_TYPES: [
    'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery',
    'parking_lot', 'restaurant', 'accommodation_provider', 'ticket_provider'
  ],

  // Business-level default settings per merchant type
  BUSINESS_SETTINGS: {
    DEFAULT_BOOKINGS_ENABLED: false,
    DEFAULT_DELIVERY_ENABLED: false,
    DEFAULT_PICKUP_ENABLED: false,
    DEFAULT_PREP_TIME_MINUTES: {
      restaurant: 10,
      dark_kitchen: 15,
      caterer: 45,
      cafe: 8,
      bakery: 8,
      butcher: 5,
      grocery: 10,
      parking_lot: 5,
      accommodation_provider: 30,
      ticket_provider: 5
    },
    DEFAULT_UI: 'generic',
    DEFAULT_SERVICES: {
      restaurant: ['mtables', 'munch'],
      dark_kitchen: ['munch'],
      caterer: ['munch', 'mevents'],
      cafe: ['munch'],
      bakery: ['munch'],
      butcher: ['munch'],
      grocery: ['munch'],
      parking_lot: ['mpark'],
      accommodation_provider: ['mstays'],
      ticket_provider: ['mtickets', 'mevents']
    },
    AI_ENABLED_FEATURES: [
      'recommendations', 'scheduling', 'inventory_management', 'customer_support',
      'room_optimization', 'sustainability_scorer', 'ticket_optimization', 'event_recommendations'
    ],
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'telegram'],
    DEFAULT_TASKS: ['process_orders', 'update_inventory', 'customer_support', 'manage_bookings', 'manage_ticket_bookings']
  },

  // Branch and security settings
  BRANCH_SETTINGS: {
    DEFAULT_MAX_BRANCHES: 100,
    DEFAULT_MAX_LOGIN_SESSIONS: 5,
    DEFAULT_SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: {
      ENABLED: true,
      METHODS: ['sms', 'email', 'authenticator_app']
    }
  },

  // Wallet and payout settings
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'merchant',
    PAYMENT_METHODS: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    TRANSACTION_TYPES: [
      'order_payment', 'booking_payment', 'event_payment', 'parking_payment', 'payout',
      'refund', 'deposit'
    ],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_ENABLED: true
    },
    MAX_DAILY_TRANSACTIONS: 1000,
    MAX_TRANSACTION_AMOUNT: 50000,
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: ['order_payment', 'booking_payment', 'event_payment', 'parking_payment', 'payout', 'refund', 'deposit'],
      METRICS: ['revenue', 'payout_volume', 'refund_rate', 'transaction_success_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'authenticator_app'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    }
  },

  // Notification settings
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'order_confirmation', 'payment_confirmation', 'support_response', 'social_media_post',
      'booking_confirmation', 'check_in_reminder', 'ticket_confirmation', 'event_reminder',
      'event_created', 'event_updated', 'event_cancelled', 'stay_confirmation', 'stay_cancellation',
      'parking_confirmation', 'parking_cancellation', 'parking_time_extension'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high', 'urgent'],
    MAX_NOTIFICATIONS_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },

  // Accessibility features
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'braille_support'],
    FONT_SIZE_RANGE: { min: 10, max: 28 }
  },

  // Compliance and audit settings
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: {
      ALL_MERCHANTS: ['business_license', 'tax_registration', 'data_protection'],
      FOOD_MERCHANTS: ['food_safety', 'health_permit'],
      BAKERY_SPECIFIC: ['halal_certification', 'kosher_certification'],
      BUTCHER_SPECIFIC: ['halal_certification'],
      CAFE_SPECIFIC: ['halal_certification', 'kosher_certification'],
      CATERER_SPECIFIC: ['halal_certification', 'kosher_certification'],
      DARK_KITCHEN_SPECIFIC: ['halal_certification', 'kosher_certification'],
      GROCERY_SPECIFIC: ['halal_certification', 'kosher_certification'],
      PARKING_LOT_SPECIFIC: ['parking_permit', 'fire_safety'],
      RESTAURANT_SPECIFIC: ['halal_certification', 'kosher_certification', 'alcohol_license']
    },
    CERTIFICATION_SETTINGS: {
      CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired', 'suspended'],
      CERTIFICATION_EXPIRY_DAYS: 365,
      RENEWAL_NOTIFICATION_DAYS: [30, 15, 7, 1],
      AUTO_RENEWAL_ENABLED: true,
      AUTO_RENEWAL_THRESHOLD_DAYS: 30,
      DOCUMENT_UPLOAD_FORMATS: ['pdf', 'jpg', 'png'],
      MAX_DOCUMENT_SIZE_MB: 10
    },
    AUDIT_SETTINGS: {
      AUDIT_FREQUENCY_DAYS: 90,
      AUDIT_TYPES: [
        'order_processed', 'inventory_updated', 'payment_processed', 'booking_confirmed', 'event_confirmed',
        'custom_order_confirmed', 'substitution_processed', 'check_in_processed', 'compliance_review'
      ],
      AI_AUDIT_ANALYSIS: true,
      AUDIT_LOG_RETENTION_DAYS: 730,
      AUDIT_REPORT_FORMATS: ['pdf', 'csv', 'json'],
      NON_COMPLIANCE_PENALTIES: [
        { type: 'warning', severity: 'low', action: 'notification' },
        { type: 'fine', severity: 'medium', action: 'payment_deduction' },
        { type: 'suspension', severity: 'high', action: 'account_restriction' }
      ]
    },
    DATA_PROTECTION_STANDARDS: {
      SUPPORTED_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
      CONSENT_METHODS: ['explicit', 'implicit', 'opt_in', 'opt_out'],
      DATA_RETENTION_DEFAULT_DAYS: 365,
      DATA_ANONYMIZATION_ENABLED: true,
      DATA_BREACH_NOTIFICATION_HOURS: 72
    }
  },

  // Staff-related settings
  STAFF_CONSTANTS: {
    DEFAULT_ROLES: [
      'server', 'host', 'chef', 'manager', 'butcher', 'barista', 'stock_clerk', 'picker',
      'cashier', 'driver', 'packager', 'event_staff', 'consultant', 'front_of_house',
      'back_of_house', 'car_park_operative', 'front_desk', 'housekeeping', 'concierge',
      'ticket_agent', 'event_coordinator'
    ],
    DEFAULT_PERMISSIONS: ['process_orders', 'view_analytics', 'handle_complaints', 'manage_bookings', 'manage_ticket_bookings'],
    DEFAULT_TASK_TYPES: ['customer_support', 'manage_bookings', 'manage_ticket_bookings'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6,
      AI_SHIFT_SCHEDULING: true
    }
  },

  // Analytics and reporting
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'order_volume', 'revenue', 'customer_retention', 'room_occupancy', 'guest_satisfaction',
      'sustainability_impact', 'ticket_sales', 'event_attendance'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['customer_preferences', 'room_optimization', 'event_recommendations']
  },

  // API exposure and security
  API_CONSTANTS: {
    API_VERSION: '2.0.0',
    RATE_LIMITS: {
      REQUESTS_PER_MINUTE: 60,
      REQUESTS_PER_HOUR: 1000,
      BURST_LIMIT: 100
    },
    ENDPOINT_PREFIX: '/api/v2/merchant',
    SUPPORTED_METHODS: ['GET', 'POST', 'PUT', 'DELETE'],
    AUTH_METHODS: ['jwt', 'api_key', 'oauth2']
  },

  // Common error and success codes/messages
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_ORDER_TYPE',
    'INVALID_BOOKING_TYPE', 'INVALID_TICKET_TYPE', 'WALLET_INSUFFICIENT_FUNDS', 'DISPUTED'
  ],
  SUCCESS_MESSAGES: [
    'order_processed', 'payment_completed', 'inventory_updated', 'social_post_shared',
    'booking_processed', 'ticket_sold', 'event_created', 'event_updated', 'event_cancelled',
    'stay_booked', 'stay_updated', 'stay_cancelled', 'refund_processed', 'wallet_funded'
  ],

  // Social media posting
  SOCIAL_MEDIA_CONSTANTS: {
    SUPPORTED_PLATFORMS: ['x', 'instagram', 'facebook', 'linkedin', 'tiktok', 'telegram'],
    POST_TYPES: ['promotion', 'update', 'event', 'review', 'booking', 'ticket_sale'],
    MAX_POST_LENGTH: 280,
    MAX_MEDIA_PER_POST: 4,
    ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'mp4', 'webp'],
    MAX_MEDIA_SIZE_MB: 10
  },

  // Support and ticketing
  SUPPORT_CONSTANTS: {
    SUPPORT_CHANNELS: ['email', 'phone', 'chat', 'whatsapp', 'telegram'],
    RESPONSE_TIME_HOURS: {
      STANDARD: 24,
      PRIORITY: 4,
      URGENT: 1
    },
    TICKET_STATUSES: ['open', 'in_progress', 'resolved', 'closed'],
    MAX_TICKETS_PER_DAY: 50,
    AI_TICKET_ROUTING: true
  }
};
