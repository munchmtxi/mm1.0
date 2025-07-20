'use strict';

module.exports = {
  MERCHANT_TYPES: [
    'bakery', 'butcher', 'cafe', 'caterer', 'dark_kitchen', 'grocery', 'parking_lot',
    'restaurant', 'accommodation_provider', 'ticket_provider'
  ],
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
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'order_volume', 'revenue', 'customer_retention', 'room_occupancy', 'guest_satisfaction',
      'sustainability_impact', 'ticket_sales', 'event_attendance'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 365,
    RECOMMENDATION_CATEGORIES: ['customer_preferences', 'room_optimization', 'event_recommendations']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'order_confirmation', 'payment_confirmation', 'support_response', 'social_media_post',
      'booking_confirmation', 'check_in_reminder', 'ticket_confirmation', 'event_reminder',
      'event_created', 'event_updated', 'event_cancelled', 'stay_confirmation', 'stay_cancellation',
      'parking_confirmation', 'parking_cancellation', 'parking_time_extension'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'accessible_seating'],
    FONT_SIZE_RANGE: { min: 12, max: 24 }
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['business_license', 'hospitality_license', 'sustainability_certification', 'ticket_license', 'event_safety'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 180,
    AUDIT_TYPES: [
      'order_processed', 'payment_processed', 'booking_processed', 'ticket_sold', 'event_created',
      'event_updated', 'event_cancelled', 'participant_added', 'bill_processed', 'chat_message_sent',
      'social_media_interaction', 'crowdfunding_processed', 'service_bundle_created', 'booking_created',
      'booking_updated', 'booking_cancelled', 'check_in_processed', 'refund_processed', 'dispute_resolved',
      'sustainability_audit', 'table_assigned', 'table_adjusted', 'table_availability_updated',
      'pre_order_created', 'stay_booked', 'stay_updated', 'stay_cancelled', 'check_in_out_processed',
      'room_maintenance_reported', 'ticket_booked', 'ticket_updated', 'ticket_cancelled'
    ]
  },
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_ORDER_TYPE',
    'INVALID_BOOKING_TYPE', 'INVALID_TICKET_TYPE'
  ],
  SUCCESS_MESSAGES: [
    'order_processed', 'payment_completed', 'inventory_updated', 'social_post_shared',
    'booking_processed', 'ticket_sold', 'event_created', 'event_updated', 'event_cancelled',
    'stay_booked', 'stay_updated', 'stay_cancelled'
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
    SUPPORTED_PLATFORMS: ['x', 'instagram', 'facebook', 'linkedin', 'tiktok', 'telegram'],
    POST_TYPES: ['promotion', 'update', 'event', 'review', 'booking', 'ticket_sale'],
    MAX_POST_LENGTH: 280,
    MAX_MEDIA_PER_POST: 4,
    ALLOWED_MEDIA_TYPES: ['jpg', 'png', 'jpeg', 'mp4'],
    MAX_MEDIA_SIZE_MB: 10
  },
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