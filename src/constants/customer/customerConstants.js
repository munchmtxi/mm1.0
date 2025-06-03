/**
 * customerConstants.js
 *
 * Defines constants for the Customer Role System, covering interactions with mtables (table bookings),
 * munch (food orders), mtxi (ride requests), and mevents (event services). Supports expanded merchant
 * types (restaurant, dark_kitchen, butcher, grocery, caterer, cafe, bakery), global operations
 * (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa, India, Brazil) with inclusivity
 * (e.g., halal filters), and aligns with merchantConstants.js, staffConstants.js, driverConstants.js,
 * and admin constants.
 *
 * Last Updated: June 01, 2025
 */

'use strict';

module.exports = {
  // Customer Statuses
  CUSTOMER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended'],

  // Customer Configuration
  CUSTOMER_SETTINGS: {
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
    MAX_FRIENDS_PER_CUSTOMER: 100,
    MAX_ACTIVE_BOOKINGS: 5,
    MAX_ACTIVE_ORDERS: 10,
    MAX_ACTIVE_RIDES: 2,
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30
  },

  // Service Access: mtables (Table Bookings)
  MTABLES_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe'],
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'],
    CHECK_IN_METHODS: ['qr_code', 'manual'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 1,
      MAX_BOOKING_HOURS: 4,
      CANCELLATION_WINDOW_HOURS: 24,
      EXTENSION_LIMIT_MINUTES: 120,
      MIN_DEPOSIT_PERCENTAGE: 10
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 20,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 30,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 20
    }
  },

  // Service Access: munch (Food Orders)
  MUNCH_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
    ORDER_STATUSES: ['pending', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'],
      MAX_ORDER_ITEMS: 50,
      MIN_ORDER_AMOUNT: 5
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 20,
      MIN_DELIVERY_TIME_MINUTES: 15,
      MAX_DELIVERY_TIME_MINUTES: 90
    }
  },

  // Service Access: mtxi (Ride Requests)
  MTXI_CONSTANTS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    RIDE_TYPES: ['standard', 'shared'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 4,
      MIN_RIDE_DISTANCE_KM: 1,
      MAX_RIDE_DISTANCE_KM: 50,
      CANCELLATION_WINDOW_MINUTES: 5
    },
    SHARED_RIDE_SETTINGS: {
      MAX_FRIENDS_PER_RIDE: 3
    }
  },

  // Service Access: mevents (Event Services)
  MEVENTS_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['caterer', 'restaurant'],
    EVENT_TYPES: ['birthday', 'dinner', 'party', 'custom'],
    EVENT_STATUSES: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 100,
      MIN_LEAD_TIME_DAYS: 1,
      MAX_BOOKINGS_PER_EVENT: 5,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
    }
  },

  // Wallet and Financial Management
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'customer',
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TRANSACTION_TYPES: ['deposit', 'payment', 'refund', 'withdrawal', 'cashback', 'tip'],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
      MAX_DEPOSIT_AMOUNT: 5000,
      MIN_WITHDRAWAL_AMOUNT: 10,
      MAX_WITHDRAWAL_AMOUNT: 10000,
      MAX_PAYMENT_METHODS: 5,
      TRANSACTION_LIMIT_PER_DAY: 50
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: ['deposit', 'payment', 'refund', 'withdrawal', 'cashback', 'tip']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'auth_app'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 30
    }
  },

  // Social Features
  SOCIAL_CONSTANTS: {
    FRIEND_PERMISSIONS: ['view_profile', 'view_bookings', 'view_orders', 'view_rides', 'split_payment', 'send_invites'],
    GROUP_CHAT_SETTINGS: {
      MAX_PARTICIPANTS: 50,
      MAX_MESSAGES_PER_HOUR: 100
    },
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 100,
      MIN_LEAD_TIME_DAYS: 1,
      MAX_BOOKINGS_PER_EVENT: 5
    }
  },

  // Promotions and Loyalty
  PROMOTION_CONSTANTS: {
    PROMOTION_TYPES: ['discount', 'loyalty', 'referral', 'cashback'],
    LOYALTY_TIERS: [
      { name: 'Bronze', minPoints: 0, discount: 5, cashback: 2 },
      { name: 'Silver', minPoints: 500, discount: 10, cashback: 5 },
      { name: 'Gold', minPoints: 1000, discount: 15, cashback: 10 }
    ],
    REFERRAL_SETTINGS: {
      REFERRAL_BONUS_POINTS: 100,
      MAX_REFERRALS_PER_CUSTOMER: 50,
      REFERRAL_WALLET_CREDIT: 5
    },
    DISCOUNT_SETTINGS: {
      MAX_DISCOUNT_PERCENTAGE: 50,
      MIN_DISCOUNT_AMOUNT: 1
    },
    CASHBACK_SETTINGS: {
      MAX_CASHBACK_PERCENTAGE: 20,
      MIN_CASHBACK_AMOUNT: 1
    }
  },

  // Subscriptions
  SUBSCRIPTION_CONSTANTS: {
    SUBSCRIPTION_PLANS: [
      { name: 'Basic', benefits: ['priority_bookings', 'free_delivery'], durationDays: 30 },
      { name: 'Premium', benefits: ['priority_bookings', 'free_delivery', 'exclusive_discounts', 'unlimited_rides'], durationDays: 30 }
    ],
    MAX_ACTIVE_SUBSCRIPTIONS: 1,
    SUBSCRIPTION_STATUSES: ['active', 'paused', 'cancelled']
  },

  // Analytics
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_frequency', 'booking_frequency', 'ride_frequency', 'spending_trends', 'wallet_usage', 'loyalty_points'],
    REPORT_FORMATS: ['pdf', 'csv', 'json'],
    DATA_RETENTION_DAYS: 365,
    RECOMMENDATION_CATEGORIES: ['restaurants', 'menu_items', 'ride_times', 'booking_times', 'events'],
    AUDIT_TYPES: {
      TRACK_BEHAVIOR: 'analytics:track_behavior',
      ANALYZE_SPENDING: 'analytics:analyze_spending',
      PROVIDE_RECOMMENDATIONS: 'analytics:provide_recommendations',
      AWARD_POINTS: 'analytics:award_points',
      BOOKING_CREATED: 'booking:created',
      BOOKING_UPDATED: 'booking:updated',
      BOOKING_CANCELLED: 'booking:cancelled',
      CHECK_IN_PROCESSED: 'check_in:processed',
      FEEDBACK_SUBMITTED: 'feedback:submitted',
      PARTY_MEMBER_ADDED: 'party_member:added',
      TABLE_SEARCHED: 'table:searched',
      PAYMENT_PROCESSED: 'payment:processed',
      REFUND_PROCESSED: 'payment:refunded',
      PAYMENT_REQUEST_SENT: 'payment_request:sent'
    }
  },

  // Gamification Metrics
  GAMIFICATION_CONSTANTS: {
    CUSTOMER_ACTIONS: [
      { action: 'booking_created', points: 25 },
      { action: 'check_in', points: 10 },
      { action: 'feedback_submitted', points: 5 },
      { action: 'table_searched', points: 5 },
      { action: 'payment', points: 15 },
      { action: 'extra_order', points: 10, walletCredit: 0.30 },
      { action: 'pre_order', points: 50, walletCredit: 1.00 },
      { action: 'group_coordinator', points: 100, walletCredit: 2.00 },
      { action: 'early_bird_pre_order', points: 30, walletCredit: 0.75 },
      { action: 'order_frequency', points: 30, walletCredit: 0.75 },
      { action: 'payment_streak', points: 30, walletCredit: 0.75 },
      { action: 'wallet_usage', points: 15, walletCredit: 0.40 },
      { action: 'loyalty_tier', points: 500, walletCredit: 10.00 },
      { action: 'referral', points: 100, walletCredit: 2.00 },
      { action: 'review', points: 25, walletCredit: 0.60 },
      { action: 'tipping', points: 15, walletCredit: 0.40 },
      { action: 'profile_completion', points: 100, walletCredit: 2.00 },
      { action: 'event_planning', points: 100, walletCredit: 2.00 },
      { action: 'split_payment', points: 20, walletCredit: 0.50 },
      { action: 'subscription_loyalty', points: 200, walletCredit: 5.00 }
    ],
    POINT_EXPIRY_DAYS: 365,
    MAX_POINTS_PER_DAY: 1000
  },

  // Support and Dispute Resolution
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['booking', 'order', 'ride', 'event', 'payment', 'wallet'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology'],
    SUPPORT_RESPONSE_TIME_HOURS: 24
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: {
      booking_confirmation: 'booking_confirmation',
      check_in_confirmation: 'check_in_confirmation',
      feedback_confirmation: 'feedback_confirmation',
      payment_confirmation: 'payment_confirmation',
      payment_request: 'payment_request',
      booking_invitation: 'booking_invitation',
      order_update: 'order_update',
      ride_update: 'ride_update',
      event_update: 'event_update',
      wallet_update: 'wallet_update',
      friend_request: 'friend_request',
      event_invite: 'event_invite',
      promotion: 'promotion',
      support_response: 'support_response'
    },
    DELIVERY_METHODS: ['push', 'email', 'sms'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },

  // Accessibility and Inclusivity
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands'],
    FONT_SIZE_RANGE: { min: 12, max: 24 },
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
  },

  // Cross-Vertical Integration
  CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mtxi', 'mevents'],
    LOYALTY_UNIFICATION: { POINT_CONVERSION_RATE: 1 },
    UI_CONSISTENCY: { THEME: 'default', COLOR_SCHEME: 'neutral', FONT_FAMILY: 'Roboto' }
  },

  // Operational Resilience
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 50,
    SYNC_INTERVAL_MINUTES: 5,
    WEBSOCKET_HEARTBEAT_SECONDS: 30,
    MAX_OFFLINE_TRANSACTIONS: 50
  },

  // Security
  SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    PERMISSION_LEVELS: ['read', 'write', 'restricted'],
    MFA_METHODS: ['sms', 'email', 'auth_app'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    AUDIT_LOG_RETENTION_DAYS: 180
  },

  // Compliance
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 180,
    AUDIT_TYPES: {
      BOOKING_CREATED: 'booking:created',
      BOOKING_UPDATED: 'booking:updated',
      BOOKING_CANCELLED: 'booking:cancelled',
      CHECK_IN_PROCESSED: 'check_in:processed',
      FEEDBACK_SUBMITTED: 'feedback:submitted',
      PARTY_MEMBER_ADDED: 'party_member:added',
      TABLE_SEARCHED: 'table:searched',
      PAYMENT_PROCESSED: 'payment:processed',
      REFUND_PROCESSED: 'payment:refunded',
      PAYMENT_REQUEST_SENT: 'payment_request:sent'
    }
  },

  // Error Codes
  ERROR_CODES: [
    'INVALID_CUSTOMER', 'CUSTOMER_NOT_FOUND', 'PERMISSION_DENIED', 'WALLET_INSUFFICIENT_FUNDS',
    'PAYMENT_FAILED', 'BOOKING_FAILED', 'ORDER_FAILED', 'RIDE_FAILED', 'EVENT_FAILED',
    'OFFLINE_MODE_UNAVAILABLE', 'INVALID_DIETARY_FILTER'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'Customer registered', 'Booking confirmed', 'Order placed', 'Ride requested', 'Event created',
    'Payment completed', 'Wallet funded', 'Gamification points awarded', 'Support ticket resolved'
  ]
};