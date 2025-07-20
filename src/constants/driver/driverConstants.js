'use strict';

module.exports = {
  DRIVER_STATUSES: ['available', 'on_ride', 'on_delivery', 'offline', 'pending_verification', 'suspended', 'banned'],
  DRIVER_SETTINGS: {
    MAX_VEHICLES_PER_DRIVER: 3,
    MAX_ACTIVE_TASKS: 7,
    KYC_REQUIRED: true,
    ONBOARDING_STATUSES: ['pending', 'verified', 'rejected']
  },
  MTXI_CONSTANTS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled', 'delayed'],
    RIDE_TYPES: ['standard', 'shared', 'premium', 'scheduled'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 4,
      MIN_RIDE_DISTANCE_KM: 0.5,
      MAX_RIDE_DISTANCE_KM: 150,
      CANCELLATION_WINDOW_MINUTES: 5,
      TIMELY_PICKUP_WINDOW_MINUTES: 3,
      AI_DISPATCH: true
    },
    SHARED_RIDE_SETTINGS: {
      MAX_PASSENGERS_PER_SHARED_RIDE: 4,
      MAX_STOPS_PER_SHARED_RIDE: 5,
      AI_ROUTE_OPTIMIZATION: true
    }
  },
  MUNCH_DELIVERY_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery', 'venue'],
    DELIVERY_STATUSES: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled', 'refunded'],
    DELIVERY_TYPES: ['standard', 'batch', 'event'],
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 25,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 120,
      BATCH_DELIVERY_LIMIT: 7,
      EVENT_DELIVERY_WINDOW_MINUTES: 20,
      CANCELLATION_WINDOW_MINUTES: 3,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'],
      AI_ROUTE_OPTIMIZATION: true,
      REAL_TIME_TRACKING: true,
      EVENT_DELIVERY: {
        TICKET_INTEGRATION: {
          ENABLED: false, // Primarily e-tickets; can be enabled for physical ticket delivery
          TICKET_TYPES: ['EVENT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'THEATER', 'CONFERENCE', 'EXHIBITION', 'WORKSHOP', 'SEMINAR'],
          ACCESS_METHODS: ['QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'NFC'],
          AI_TICKET_ALLOCATION: true
        },
        EVENT_TYPES: ['birthday', 'anniversary', 'corporate', 'social', 'wedding', 'conference', 'baby_shower', 'festival', 'seminar', 'workshop', 'concert', 'sports', 'theater', 'exhibition', 'custom']
      }
    }
  },
  AVAILABILITY_CONSTANTS: {
    AVAILABILITY_STATUSES: ['available', 'unavailable'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      MIN_BREAK_BETWEEN_SHIFTS_MINUTES: 30,
      AI_SHIFT_SCHEDULING: true
    },
    HIGH_DEMAND_PERIODS: ['morning_rush', 'lunch_rush', 'evening_rush', 'event_peak']
  },
  WALLET_CONSTANTS: {
    WALLET_TYPE: 'driver',
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TRANSACTION_TYPES: ['ride_earning', 'delivery_earning', 'tip', 'payout', 'bonus'],
    WALLET_SETTINGS: {
      MIN_PAYOUT: 5,
      MAX_PAYOUT: 10000,
      TRANSACTION_LIMIT_PER_DAY: 100,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      AUTO_PAYOUT_THRESHOLD: 100,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT']
    },
    PAYMENT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer', 'crypto']
  },
  PROFILE_CONSTANTS: {
    VEHICLE_TYPES: ['car', 'motorbike', 'bicycle', 'van', 'electric_scooter'],
    REQUIRED_CERTIFICATIONS: ['drivers_license', 'vehicle_insurance', 'food_safety_driver', 'background_check'],
    REQUIRED_FIELDS: ['full_name', 'email', 'phone_number', 'vehicle_type', 'drivers_license', 'vehicle_insurance', 'background_check'],
    OPTIONAL_FIELDS: ['profile_picture', 'emergency_contact', 'preferred_language', 'accessibility_features']
  },
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'ride_completion_rate', 'delivery_completion_rate', 'average_ride_time', 'average_delivery_time',
      'customer_ratings', 'earnings_trends', 'fuel_efficiency', 'eco_route_adoption'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  ONBOARDING_CONSTANTS: {
    TRAINING_MODULES: [
      'platform_usage', 'safety_protocols', 'customer_interaction', 'ride_handling', 'delivery_handling',
      'dietary_compliance', 'event_delivery_training', 'eco_driving'
    ],
    CERTIFICATION_STATUSES: ['pending', 'completed', 'expired', 'rejected'],
    CERTIFICATION_EXPIRY_DAYS: 365
  },
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['ride', 'delivery', 'payment', 'wallet', 'safety', 'vehicle', 'customer_interaction'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['compensation', 'apology', 'account_credit', 'no_action'],
    SUPPORT_RESPONSE_TIME_HOURS: 12,
    SUPPORT_CHANNELS: ['in_app_chat', 'email', 'phone', 'whatsapp', 'telegram'],
    AI_CHATBOT: true
  },
  SAFETY_CONSTANTS: {
    INCIDENT_TYPES: ['accident', 'unsafe_customer', 'vehicle_issue', 'road_hazard', 'health_emergency'],
    SOS_METHODS: ['emergency_call', 'discreet_alert', 'in_app_sos'],
    SAFETY_ALERT_FREQUENCY_MINUTES: 3,
    SAFETY_FEATURES: ['panic_button', 'real_time_location_sharing', 'route_deviation_alert']
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'ride_task_assigned', 'delivery_task_assigned', 'payment_confirmation', 'tip_received', 'support_response',
      'safety_alert', 'high_demand', 'schedule_update', 'eco_route_suggested', 'payout_completed',
      'event_delivery_assigned'
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
    SERVICES: ['mtxi', 'munch', 'mevents'],
    UI_CONSISTENCY: { THEME: 'modern', COLOR_SCHEME: 'dynamic', FONT_FAMILY: 'Inter' },
    SERVICE_INTEGRATIONS: ['munch', 'mtxi', 'mevents', 'external_vendors']
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
    REGULATORY_REQUIREMENTS: ['drivers_license', 'vehicle_insurance', 'food_safety_driver', 'background_check'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'ride_completed', 'delivery_completed', 'payout_processed', 'certification_uploaded', 'profile_updated',
      'safety_report_submitted', 'route_calculated', 'route_updated', 'eco_route_selected',
      'event_delivery_processed'
    ]
  },
  ERROR_CODES: [
    'INVALID_DRIVER', 'DRIVER_NOT_FOUND', 'PERMISSION_DENIED', 'WALLET_INSUFFICIENT_FUNDS', 'PAYMENT_FAILED',
    'RIDE_FAILED', 'DELIVERY_FAILED', 'OFFLINE_MODE_UNAVAILABLE', 'INVALID_VEHICLE_TYPE', 'CERTIFICATION_EXPIRED',
    'INVALID_EMAIL', 'INVALID_PHONE', 'INVALID_RIDE_ASSIGNMENT', 'INVALID_DELIVERY_ASSIGNMENT', 'KYC_NOT_COMPLETED'
  ],
  SUCCESS_MESSAGES: [
    'driver_registered', 'ride_completed', 'delivery_completed', 'payment_received', 'payout_processed',
    'support_ticket_resolved', 'training_completed', 'profile_updated', 'certification_uploaded',
    'profile_retrieved', 'profile_verified', 'eco_route_selected', 'event_delivery_completed'
  ]
};