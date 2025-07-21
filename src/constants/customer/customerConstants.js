'use strict';

module.exports = {
  CUSTOMER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'banned'],
  CUSTOMER_SETTINGS: {
    MAX_FRIENDS_PER_CUSTOMER: 200,
    MAX_ACTIVE_BOOKINGS: 7,
    MAX_ACTIVE_ORDERS: 15,
    MAX_ACTIVE_RIDES: 3,
    MAX_ACTIVE_PARKING_BOOKINGS: 3,
    MAX_ACTIVE_EVENTS: 5,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'],
    DIETARY_PREFERENCES: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic']
  },
  MTABLES_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'caterer'],
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    CHECK_IN_METHODS: ['qr_code', 'manual', 'nfc'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 0.5,
      MAX_BOOKING_HOURS: 6,
      CANCELLATION_WINDOW_HOURS: 12,
      EXTENSION_LIMIT_MINUTES: 180,
      MIN_DEPOSIT_PERCENTAGE: 5
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 30,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 15,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 30,
      SEATING_PREFERENCES: ['indoor', 'outdoor', 'rooftop', 'balcony', 'window', 'booth', 'high_top']
    }
  },
  MUNCH_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery', 'pre_order'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 2,
      AI_RECOMMENDATIONS: ['personalized_menu', 'dietary_suggestions', 'trending_items'],
      SOCIAL_SHARING: ['share_order', 'post_review', 'invite_friends']
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 25,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 120,
      EVENT_DELIVERY_WINDOW_MINUTES: 20,
      AI_ROUTE_OPTIMIZATION: true,
      REAL_TIME_TRACKING: true
    }
  },
  MTXI_CONSTANTS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'delayed'],
    RIDE_TYPES: ['standard', 'shared', 'premium', 'scheduled'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 4,
      MIN_RIDE_DISTANCE_KM: 0.5,
      MAX_RIDE_DISTANCE_KM: 150,
      CANCELLATION_WINDOW_MINUTES: 5
    },
    SHARED_RIDE_SETTINGS: {
      MAX_FRIENDS_PER_RIDE: 4,
      MAX_STOPS: 5,
      AI_ROUTE_OPTIMIZATION: true
    }
  },
  MEVENTS_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['caterer', 'restaurant', 'venue', 'entertainment', 'decor'],
    EVENT_TYPES: ['birthday', 'anniversary', 'corporate', 'social', 'wedding', 'conference', 'baby_shower', 'festival', 'seminar', 'workshop', 'concert', 'sports', 'theater', 'exhibition', 'custom'],
    EVENT_STATUSES: ['draft', 'confirmed', 'active', 'completed', 'cancelled'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 500,
      MIN_LEAD_TIME_DAYS: 0.5,
      MAX_BOOKINGS_PER_EVENT: 10,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
      AI_PLANNING_TOOLS: ['budget_optimizer', 'vendor_recommendations', 'schedule_generator', 'venue_suggestions'],
      SOCIAL_SHARING: ['event_invite', 'post_event', 'live_updates', 'tag_friends']
    }
  },
  MPARK_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['parking_lot'],
    PARKING_STATUSES: ['pending', 'confirmed', 'occupied', 'completed', 'cancelled', 'no_show'],
    PARKING_TYPES: ['standard', 'accessible', 'ev_charging', 'oversized', 'premium', 'private', 'motorbike'],
    PARKING_SETTINGS: {
      MIN_BOOKING_MINUTES: 15,
      MAX_BOOKING_DAYS: 365,
      CANCELLATION_WINDOW_HOURS: 1,
      EXTENSION_LIMIT_MINUTES: 120,
      MAX_ACTIVE_PARKING_BOOKINGS: 3
    },
    CHECK_IN_METHODS: ['qr_code', 'license_plate', 'manual', 'nfc']
  },
  MSTAYS_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['accommodation_provider'],
    STAY_STATUSES: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    STAY_TYPES: ['standard', 'suite', 'accessible', 'extended_stay', 'short_term_rental'],
    STAY_SETTINGS: {
      MIN_STAY_DAYS: 1,
      MAX_STAY_DAYS: 365,
      CANCELLATION_WINDOW_HOURS: 24,
      CHECK_IN_METHODS: ['qr_code', 'manual', 'keycard', 'mobile_key'],
      AI_ROOM_OPTIMIZATION: true
    }
  },
  MTICKETS_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['ticket_provider'],
    TICKET_STATUSES: ['pending', 'confirmed', 'used', 'cancelled', 'refunded'],
    TICKET_TYPES: ['EVENT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'THEATER', 'CONFERENCE', 'EXHIBITION', 'WORKSHOP', 'SEMINAR'],
    TICKET_SETTINGS: {
      MAX_TICKETS_PER_BOOKING: 20,
      CANCELLATION_WINDOW_HOURS: 24,
      ACCESS_METHODS: ['QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'NFC'],
      AI_TICKET_ALLOCATION: true
    }
  },
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'customer',
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TRANSACTION_TYPES: [
      'deposit', 'ride_payment', 'order_payment', 'event_payment', 'parking_payment', 'booking_payment',
      'refund', 'withdrawal', 'tip', 'social_bill_split', 'stay_payment', 'ticket_payment'
    ],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
      MAX_DEPOSIT_AMOUNT: 10000,
      MIN_WITHDRAWAL_AMOUNT: 10,
      MAX_WITHDRAWAL_AMOUNT: 20000,
      MAX_PAYMENT_METHODS: 10,
      TRANSACTION_LIMIT_PER_DAY: 100,
      AUTO_TOP_UP_MIN: 5,
      AUTO_TOP_UP_MAX: 1000,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT']
    },
    FINANCIAL_ANALYTICS: {
      REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],
      TRANSACTION_CATEGORIES: [
        'deposit', 'ride_payment', 'order_payment', 'event_payment', 'parking_payment', 'booking_payment',
        'refund', 'withdrawal', 'tip', 'social_bill_split', 'stay_payment', 'ticket_payment'
      ],
      METRICS: ['transaction_volume', 'average_transaction_amount', 'success_rate', 'refund_rate']
    },
    SECURITY_SETTINGS: {
      MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
      TOKENIZATION_PROVIDER: 'stripe',
      MAX_LOGIN_ATTEMPTS: 5,
      LOCKOUT_DURATION_MINUTES: 15
    }
  },
  SOCIAL_CONSTANTS: {
    FRIEND_PERMISSIONS: ['view_profile', 'view_bookings', 'view_orders', 'view_rides', 'view_events', 'view_parking', 'split_payment', 'send_invites', 'share_posts'],
    GROUP_CHAT_SETTINGS: {
      MAX_PARTICIPANTS: 100,
      MAX_MESSAGES_PER_HOUR: 200,
      SUPPORTED_PLATFORMS: ['in_app', 'whatsapp', 'telegram']
    },
    BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized', 'percentage', 'sponsor_contribution'],
    MAX_SPLIT_PARTICIPANTS: 50,
    SOCIAL_SHARING: ['facebook', 'instagram', 'whatsapp', 'x', 'telegram', 'snapchat', 'tiktok'],
  },
  SUBSCRIPTION_CONSTANTS: {
    SUBSCRIPTION_PLANS: [
      { name: 'Basic', benefits: ['priority_bookings', 'free_delivery', 'loyalty_points'], durationDays: 30, price: 'dynamic' },
      { name: 'Premium', benefits: ['priority_bookings', 'free_delivery', 'exclusive_discounts', 'unlimited_rides', 'priority_parking', 'early_access_events'], durationDays: 30, price: 'dynamic' },
      { name: 'Elite', benefits: ['priority_bookings', 'free_delivery', 'exclusive_discounts', 'unlimited_rides', 'priority_parking', 'early_access_events', 'dedicated_support', 'crypto_rewards'], durationDays: 30, price: 'dynamic' }
    ],
    MAX_ACTIVE_SUBSCRIPTIONS: 2,
    SUBSCRIPTION_STATUSES: ['active', 'paused', 'cancelled', 'expired']
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['order_frequency', 'booking_frequency', 'ride_frequency', 'event_frequency', 'parking_frequency', 'spending_trends', 'wallet_usage', 'social_engagement', 'stay_frequency', 'ticket_frequency'],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['restaurants', 'menu_items', 'ride_times', 'booking_times', 'parking_times', 'events', 'vendors', 'stays', 'tickets'],
    AUDIT_TYPES: [
      'track_behavior', 'analyze_spending', 'provide_recommendations', 'booking_created', 'booking_updated',
      'booking_cancelled', 'check_in_processed', 'feedback_submitted', 'party_member_added', 'table_searched',
      'payment_processed', 'refund_processed', 'payment_request_sent', 'parking_booked', 'parking_cancelled',
      'event_created', 'event_updated', 'social_post_shared', 'TRACK_PARKING_BEHAVIOR', 'stay_booked',
      'stay_updated', 'stay_cancelled', 'check_in_out_processed', 'ticket_booked', 'ticket_updated', 'ticket_cancelled',
      'PROFILE_UPDATED', 'COUNTRY_SET', 'LANGUAGE_SET', 'DIETARY_PREFERENCES_SET', 'DEFAULT_ADDRESS_SET',
      'ACCESSIBILITY_UPDATED', 'PRIVACY_UPDATED', 'PROFILE_VIEWED'
    ]
  },
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['booking', 'order', 'ride', 'event', 'parking', 'payment', 'wallet', 'social_media', 'stay', 'ticket'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology', 'account_credit'],
    SUPPORT_RESPONSE_TIME_HOURS: 12,
    SUPPORT_CHANNELS: ['in_app_chat', 'email', 'phone', 'whatsapp', 'telegram'],
    AI_CHATBOT: true
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'booking_confirmation', 'check_in_confirmation', 'feedback_confirmation', 'payment_confirmation',
      'payment_request', 'booking_invitation', 'order_update', 'ride_update', 'event_update', 'wallet_update',
      'friend_request', 'event_invite', 'support_response', 'parking_confirmation', 'parking_cancellation',
      'parking_upcoming', 'event_live_update', 'social_media_post', 'parking_behavior_tracked',
      'stay_confirmation', 'stay_cancellation', 'check_in_out_confirmation', 'ticket_confirmation',
      'ticket_cancellation', 'ticket_update'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high', 'urgent'],
    MAX_NOTIFICATIONS_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'braille_support'],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic']
  },
  CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtables', 'munch', 'mtxi', 'mevents', 'mpark', 'mstays', 'mtickets'],
    UI_CONSISTENCY: { THEME: 'modern', COLOR_SCHEME: 'dynamic', FONT_FAMILY: 'Inter' },
    SERVICE_INTEGRATIONS: ['munch', 'mtxi', 'mtables', 'mpark', 'mstays', 'mtickets', 'external_vendors']
  },
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 100,
    SYNC_INTERVAL_MINUTES: 3,
    WEBSOCKET_HEARTBEAT_SECONDS: 20,
    MAX_OFFLINE_TRANSACTIONS: 100
  },
  SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    PERMISSION_LEVELS: ['read', 'write', 'cancel', 'restricted'],
    MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    AUDIT_LOG_RETENTION_DAYS: 365
  },
  COMPLIANCE_CONSTANTS: {
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'booking_created', 'booking_updated', 'booking_cancelled', 'check_in_processed', 'feedback_submitted',
      'party_member_added', 'table_searched', 'payment_processed', 'refund_processed', 'payment_request_sent',
      'parking_booked', 'parking_cancelled', 'event_created', 'event_updated', 'social_post_shared',
      'PROFILE_UPDATED', 'COUNTRY_SET', 'LANGUAGE_SET', 'DIETARY_PREFERENCES_SET', 'DEFAULT_ADDRESS_SET',
      'ACCESSIBILITY_UPDATED', 'PRIVACY_UPDATED', 'PROFILE_VIEWED', 'stay_booked', 'stay_updated',
      'stay_cancelled', 'check_in_out_processed', 'ticket_booked', 'ticket_updated', 'ticket_cancelled'
    ]
  },
  ERROR_CODES: [
    'INVALID_CUSTOMER', 'CUSTOMER_NOT_FOUND', 'PERMISSION_DENIED', 'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED',
    'BOOKING_FAILED', 'ORDER_FAILED', 'RIDE_FAILED', 'EVENT_FAILED', 'PARKING_FAILED', 'OFFLINE_MODE_UNAVAILABLE',
    'INVALID_DIETARY_FILTER', 'MAX_FRIENDS_EXCEEDED', 'INVALID_BILL_SPLIT', 'INVALID_PROFILE_DATA',
    'INVALID_COUNTRY', 'INVALID_LANGUAGE', 'INVALID_DIETARY_PREFERENCES', 'INVALID_ADDRESS_ID',
    'INVALID_FONT_SIZE', 'INVALID_PERMISSIONS', 'INVALID_PRIVACY_SETTINGS', 'PROFILE_UPDATE_FAILED',
    'PROFILE_RETRIEVAL_FAILED', 'ACCESSIBILITY_UPDATE_FAILED', 'PRIVACY_UPDATE_FAILED', 'STAY_FAILED',
    'TICKET_FAILED'
  ],
  SUCCESS_MESSAGES: [
    'customer_registered', 'booking_confirmed', 'order_placed', 'ride_requested', 'event_created', 'parking_booked',
    'payment_completed', 'wallet_funded', 'support_ticket_resolved', 'bill_split_completed', 'social_post_shared',
    'profile_updated', 'country_set', 'language_set', 'dietary_preferences_set', 'default_address_set',
    'accessibility_updated', 'privacy_updated', 'stay_booked', 'ticket_booked'
  ]
};