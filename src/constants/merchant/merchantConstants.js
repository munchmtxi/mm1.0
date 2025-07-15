'use strict';

/**
 * merchantConstants.js
 *
 * Defines base constants for all merchant types (e.g., bakery, butcher, cafe, etc.), providing
 * shared configurations for wallet operations, staff management, analytics, notifications, and
 * compliance. Aligns with driverConstants.js, staffConstants.js, customerConstants.js, admin constants,
 * and localizationConstants.js for currency and language settings.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPES: [
    'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery', 'parking_lot', 'restaurant'
  ],
  BUSINESS_SETTINGS: {
    DEFAULT_BOOKINGS_ENABLED: false,
    DEFAULT_DELIVERY_ENABLED: false,
    DEFAULT_PICKUP_ENABLED: false,
    DEFAULT_PREP_TIME_MINUTES: 10,
    DEFAULT_UI: 'generic',
    DEFAULT_SERVICES: ['munch'],
    AI_ENABLED_FEATURES: ['recommendations', 'scheduling', 'inventory_management', 'customer_support'],
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'x', 'linkedin', 'tiktok'],
    DEFAULT_TASKS: ['process_orders', 'update_inventory', 'customer_support']
  },
  BRANCH_SETTINGS: {
    DEFAULT_MAX_BRANCHES: 50,
    DEFAULT_MAX_LOGIN_SESSIONS: 3,
    DEFAULT_SESSION_TIMEOUT_MINUTES: 30,
    TWO_FACTOR_AUTH: {
      ENABLED: false,
      METHODS: ['sms', 'email', 'authenticator_app']
    }
  },
  WALLET_CONSTANTS: {
    PAYMENT_METHODS: ['wallet', 'credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 5000,
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT'],
      PAYOUT_PROCESSING_TIME_HOURS: 24
    }
  },
  STAFF_CONSTANTS: {
    DEFAULT_ROLES: ['manager', 'customer_service'],
    DEFAULT_PERMISSIONS: ['process_orders', 'view_analytics', 'handle_complaints'],
    DEFAULT_TASK_TYPES: ['customer_support'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6,
      AI_SHIFT_SCHEDULING: false
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_volume', 'revenue', 'customer_retention'],
    REPORT_FORMATS: ['pdf', 'csv', 'json'],
    DATA_RETENTION_DAYS: 365,
    RECOMMENDATION_CATEGORIES: ['customer_preferences']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'order_confirmation', 'payment_confirmation', 'support_response', 'social_media_post'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms'],
    PRIORITY_LEVELS: ['low', 'medium', 'high'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast'],
    FONT_SIZE_RANGE: { min: 12, max: 24 }
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['business_license'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 180,
    AUDIT_TYPES: ['order_processed', 'payment_processed']
  
    
  },
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_ORDER_TYPE'
  ],
  SUCCESS_MESSAGES: [
    'order_processed', 'payment_completed', 'inventory_updated', 'social_post_shared'
  ],
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
  SOCIAL_MEDIA_CONSTANTS: {
    SUPPORTED_PLATFORMS: ['x', 'instagram', 'facebook', 'linkedin', 'tiktok'],
    POST_TYPES: ['promotion', 'update', 'event', 'review'],
    MAX_POST_LENGTH: 280,
    MAX_MEDIA_PER_POST: 4,
    ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'mp4'],
    MAX_MEDIA_SIZE_MB: 10
  },
  SUPPORT_CONSTANTS: {
    SUPPORT_CHANNELS: ['email', 'phone', 'chat', 'whatsapp'],
    RESPONSE_TIME_HOURS: {
      STANDARD: 24,
      PRIORITY: 4,
      URGENT: 1
    },
    TICKET_STATUSES: ['open', 'in_progress', 'resolved', 'closed'],
    MAX_TICKETS_PER_DAY: 50,
    AI_TICKET_ROUTING: false
  }
};