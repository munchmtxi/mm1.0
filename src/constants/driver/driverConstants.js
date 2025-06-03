'use strict';

module.exports = {
  DRIVER_STATUSES: ['available', 'on_ride', 'on_delivery', 'offline', 'pending_verification', 'suspended'],
  DRIVER_SETTINGS: {
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
    SUPPORTED_MAP_PROVIDERS: {
      US: 'google_maps', EU: 'openstreetmap', MW: 'google_maps', TZ: 'google_maps',
      KE: 'google_maps', MZ: 'google_maps', NG: 'google_maps', ZA: 'google_maps',
      IN: 'google_maps', BR: 'google_maps'
    },
    MAX_VEHICLES_PER_DRIVER: 2,
    MAX_ACTIVE_TASKS: 5
  },
  MTXI_CONSTANTS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    RIDE_TYPES: ['standard', 'shared'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 4,
      MIN_RIDE_DISTANCE_KM: 1,
      MAX_RIDE_DISTANCE_KM: 50,
      CANCELLATION_WINDOW_MINUTES: 5,
      TIMELY_PICKUP_WINDOW_MINUTES: 5
    },
    SHARED_RIDE_SETTINGS: {
      MAX_PASSENGERS_PER_SHARED_RIDE: 4,
      MAX_STOPS_PER_SHARED_RIDE: 3
    }
  },
  MUNUCH_DELIVERY_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],
    DELIVERY_STATUSES: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled'],
    DELIVERY_TYPES: ['standard', 'batch'],
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 20,
      MIN_DELIVERY_TIME_MINUTES: 15,
      MAX_DELIVERY_TIME_MINUTES: 90,
      BATCH_DELIVERY_LIMIT: 5,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
    }
  },
  AVAILABILITY_CONSTANTS: {
    AVAILABILITY_STATUSES: ['available', 'unavailable'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 4,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6,
      MIN_BREAK_BETWEEN_SHIFTS_MINUTES: 60
    },
    HIGH_DEMAND_PERIODS: ['morning_rush', 'lunch_rush', 'evening_rush']
  },
  LOCATION_CONSTANTS: {
    LOCATION_UPDATE_FREQUENCY_SECONDS: 10,
    ROUTE_OPTIMIZATION: {
      MAX_DEVIATION_PERCENTAGE: 15,
      FUEL_EFFICIENCY_WEIGHT: 0.4,
      TIME_EFFICIENCY_WEIGHT: 0.6
    },
    MAP_SETTINGS: {
      DEFAULT_ZOOM_LEVEL: 15,
      MAX_WAYPOINTS_PER_ROUTE: 10
    }
  },
  WALLET_CONSTANTS: {
    WALLET_TYPE: ['driver'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TRANSACTION_TYPES: ['earning', 'tip', 'payout'],
    WALLET_SETTINGS: {
      MIN_PAYOUT: 10,
      MAX_PAYOUT: 5000,
      TRANSACTION_LIMIT_PER_DAY: 100
    },
    PAYMENT_METHODS: ['bank_transfer', 'mobile_money', 'wallet_transfer'],
    PAYOUT_PROCESSING_TIME_HOURS: 24,
    TAXES: ['US', 'EU', 'CA', 'AU', 'UK', 'MW', 'TZ', 'KE', 'MZ', 'NG', 'ZA', 'IN', 'BR']
  },
  PROFILE_CONSTANTS: {
    VEHICLE_TYPES: ['car', 'motorbike', 'bicycle', 'van'],
    REQUIRED_CERTIFICATIONS: ['drivers_license', 'vehicle_insurance', 'food_safety_driver'],
    REQUIRED_FIELDS: ['full_name', 'name', 'email', 'phone_number', 'vehicle_type', 'drivers_license', 'vehicle_insurance'],
    OPTIONAL_FIELDS: ['profile_picture', 'emergency_contact', 'preferred_language']
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['ride_completion_rate', 'delivery_completion_rate', 'average_delivery_time', 'customer_ratings', 'earnings_trends'],
    REPORT_FORMATS: ['pdf', 'csv', 'json'],
    DATA_RETENTION_DAYS: 365
  },
  ONBOARDING_CONSTANTS: {
    TRAINING_MODULES: ['platform_usage', 'safety_protocols', 'customer_interaction', 'delivery_handling'],
    CERTIFICATION_STATUSES: ['pending', 'completed', 'expired'],
    CERTIFICATION_EXPIRY_DAYS: 365
  },
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['ride', 'delivery', 'payment', 'wallet', 'safety'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated'],
    SUPPORT_RESPONSE_TIME_HOURS: 24
  },
  SAFETY_CONSTANTS: {
    INCIDENT_TYPES: ['accident', 'unsafe_customer', 'vehicle_issue'],
    SOS_METHODS: ['emergency_call', 'discreet_alert'],
    SAFETY_ALERT_FREQUENCY_MINUTES: 5
  },
  PROMOTION_CONSTANTS: {
    PROMOTION_TYPES: ['bonus', 'loyalty', 'referral'],
    LOYALTY_TIERS: [
      { name: 'Bronze', minPoints: 0, bonus: 5 },
      { name: 'Silver', minPoints: 500, bonus: 10 },
      { name: 'Gold', minPoints: 1000, bonus: 15 }
    ],
    REFERRAL_BONUS_POINTS: 100
  },
  GAMIFICATION_CONSTANTS: {
    DRIVER_ACTIONS: [
      { action: 'ride_completion', points: 20, walletCredit: 0.50 },
      { action: 'shared_ride_completion', points: 10, walletCredit: 0.30 },
      { action: 'timely_pickup', points: 15, walletCredit: 0.40 },
      { action: 'delivery_completion', points: 25, walletCredit: 0.60 },
      { action: 'batch_delivery', points: 15, walletCredit: 0.40 },
      { action: 'quick_delivery', points: 10, walletCredit: 0.30 },
      { action: 'shift_commitment', points: 50, walletCredit: 1.00 },
      { action: 'training_completion', points: 100, walletCredit: 2.00 },
      { action: 'certification_upload', points: 50, walletCredit: 1.00 }
    ],
    POINT_EXPIRY_DAYS: 365,
    MAX_POINTS_PER_DAY: 1000
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: ['ride_request', 'delivery_request', 'payment_confirmation', 'tip_received', 'support_response', 'safety_alert', 'high_demand', 'schedule_update'],
    DELIVERY_METHODS: ['push', 'email', 'sms'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands'],
    FONT_SIZE_RANGE: { min: 12, max: 24 },
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal']
  },
  CROSS_VERTICAL_CONSTANTS: {
    SERVICES: ['mtxi', 'munch', 'mevents'],
    LOYALTY_UNIFICATION: { POINT_CONVERSION_RATE: 1 },
    UI_CONSISTENCY: { THEME: 'default', COLOR_SCHEME: 'neutral', FONT_FAMILY: 'Roboto' }
  },
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 50,
    SYNC_INTERVAL_MINUTES: 5,
    WEBSOCKET_HEARTBEAT_SECONDS: 30,
    MAX_OFFLINE_TRANSACTIONS: 50
  },
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
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['drivers_license', 'vehicle_insurance', 'food_safety_driver'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 180
  },
  ERROR_CODES: [
    'INVALID_DRIVER', 'DRIVER_NOT_FOUND', 'PERMISSION_DENIED', 'WALLET_INSUFFICIENT_FUNDS',
    'PAYMENT_FAILED', 'RIDE_FAILED', 'DELIVERY_FAILED', 'OFFLINE_MODE_UNAVAILABLE',
    'INVALID_VEHICLE_TYPE', 'CERTIFICATION_EXPIRED', 'INVALID_EMAIL', 'INVALID_PHONE'
  ],
  SUCCESS_MESSAGES: [
    'Driver registered', 'Ride completed', 'Delivery completed', 'Payment received',
    'Payout processed', 'Gamification points awarded', 'Support ticket resolved',
    'Training completed', 'Profile updated', 'Certification uploaded', 'Profile retrieved',
    'Profile verified'
  ]
};