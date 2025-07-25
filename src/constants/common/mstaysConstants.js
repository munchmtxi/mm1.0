'use strict';

module.exports = {
  MERCHANT_TYPE: 'accommodation_provider',
  STAY_CONFIG: {
    SUPPORTED_CITIES: {
      US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco'],
      GB: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh'],
      EU: ['Berlin', 'Paris', 'Amsterdam', 'Rome', 'Madrid'],
      CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
      AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
      MW: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba'],
      TZ: ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza'],
      KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'],
      MZ: ['Maputo', 'Beira', 'Nampula', 'Matola'],
      ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
      IN: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'],
      CM: ['Douala', 'Yaoundé'],
      GH: ['Accra', 'Kumasi'],
      MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla'],
      ER: ['Asmara', 'Keren', 'Massawa']
    },
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    DEFAULT_CURRENCY: 'USD',
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'],
    DEFAULT_TIMEZONE: 'UTC',
    MAX_ACTIVE_STAY_BOOKINGS_PER_CUSTOMER: 5,
    MAX_PROPERTIES_PER_MERCHANT: 100,
    MAX_ROOMS_PER_PROPERTY: 1000,
    MIN_ROOMS_PER_PROPERTY: 1
  },
  ROOM_CONFIG: {
    ROOM_TYPES: ['STANDARD', 'SUITE', 'APARTMENT', 'VILLA', 'HOSTEL', 'ECO_LODGE', 'LUXURY', 'FAMILY', 'ACCESSIBLE'],
    ROOM_STATUSES: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE', 'CLEANING'],
    AMENITIES: [
      'WIFI', 'AIR_CONDITIONING', 'HEATING', 'KITCHEN', 'PARKING', 'POOL', 'GYM', 'SPA', 'BREAKFAST', 'PET_FRIENDLY',
      'EV_CHARGING', 'SUSTAINABLE', 'WORKSPACE', 'BALCONY', 'VIEW', 'LAUNDRY', 'ACCESSIBLE_FEATURES'
    ],
    SECURITY_FEATURES: ['CCTV', 'KEYCARD', 'SAFE', 'GUARDED', 'BIOMETRIC', 'SMART_LOCK'],
    ACCESS_TYPES: ['KEYCARD', 'SMART_LOCK', 'MOBILE_APP', 'MANUAL', 'NFC'],
    ROOM_DETAILS_FIELDS: {
      MANDATORY: ['ROOM_TYPE', 'CAPACITY', 'AVAILABILITY', 'PRICE'],
      OPTIONAL: [
        'AMENITIES', 'SECURITY_FEATURES', 'ACCESS_TYPE', 'BED_TYPE', 'SIZE_SQFT', 'VIEW_TYPE',
        'SUSTAINABILITY_CERTIFICATIONS', 'ACCESSIBILITY_FEATURES', 'CHECK_IN_OUT_FLEXIBILITY'
      ]
    }
  },
  BOOKING_CONFIG: {
    BOOKING_STATUSES: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'],
    BOOKING_TYPES: ['NIGHTLY', 'WEEKLY', 'MONTHLY', 'EXTENDED_STAY', 'EVENT'],
    CHECK_IN_METHODS: ['MOBILE_APP', 'QR_CODE', 'MANUAL', 'NFC', 'SELF_CHECK_IN'],
    BOOKING_POLICIES: {
      MIN_BOOKING_NIGHTS: 1,
      MAX_BOOKING_NIGHTS: 365,
      CANCELLATION_WINDOW_HOURS: 24,
      EXTENSION_LIMIT_DAYS: 30,
      DEFAULT_DEPOSIT_PERCENTAGE: 10,
      FLEXIBLE_CHECK_IN_OUT: {
        ENABLED: true,
        WINDOW_HOURS: 6, // Allow check-in/out within a 6-hour window
        AI_OPTIMIZATION: true // AI suggests optimal check-in/out times
      }
    },
    ROOM_MANAGEMENT: {
      MIN_ROOM_CAPACITY: 1,
      MAX_ROOM_CAPACITY: 12,
      DEFAULT_CLEANING_TIME_MINUTES: 60,
      WAITLIST_LIMIT: 50
    }
  },
  PAYMENT_CONFIG: {
    PAYMENT_METHODS: ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'MOBILE_MONEY', 'CRYPTO'],
    PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    TRANSACTION_TYPES: ['STAY_PAYMENT', 'REFUND', 'MERCHANT_PAYOUT', 'DEPOSIT'],
    PRICING_SETTINGS: {
      MIN_RATE_ENABLED: true,
      MIN_NIGHTLY_RATE: 10,
      MAX_NIGHTLY_RATE: 1000,
      MIN_WEEKLY_RATE: 50,
      MAX_WEEKLY_RATE: 5000,
      DISCOUNT_TYPES: ['EARLY_BIRD', 'LONG_TERM', 'EVENT', 'LOYALTY', 'SOCIAL_MEDIA'],
      MAX_DISCOUNT_PERCENTAGE: 50
    },
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 10,
      MAX_PAYOUT_FREQUENCY_DAYS: 30,
      SUPPORTED_PAYOUT_METHODS: ['BANK_TRANSFER', 'WALLET_TRANSFER', 'MOBILE_MONEY', 'CRYPTO'],
      PAYOUT_PROCESSING_TIME_HOURS: 24
    }
  },
  TIPPING_CONSTANTS: {
    TIPPABLE_ROLES: ['staff', 'merchant'],
    TIP_METHODS: ['percentage', 'fixed_amount', 'custom'],
    TIP_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TIP_SETTINGS: {
      MIN_TIP_AMOUNT: 1,
      MAX_TIP_AMOUNT: 100,
      DEFAULT_TIP_PERCENTAGES: [10, 15, 20],
      MAX_TIPS_PER_BOOKING: 2, // One per role (staff, merchant)
      TIP_DISTRIBUTION: {
        staff: 'direct', // Tip goes directly to assigned staff
        merchant: 'pooled' // Tip pooled for merchant staff
      },
      AUTO_TIP_SUGGESTION: true, // AI-driven tip suggestions based on stay duration/service
      TIP_CURRENCY: 'same_as_booking', // Matches booking currency
      TRANSACTION_LIMIT_PER_DAY: 50
    }
  },
  STAFF_CONFIG: {
    ROLES: ['FRONT_DESK', 'HOUSEKEEPING', 'MANAGER', 'CONCIERGE', 'MAINTENANCE', 'EVENT_COORDINATOR'],
    PERMISSIONS: [
      'MANAGE_BOOKINGS', 'CHECK_IN_GUEST', 'MONITOR_ROOMS', 'PROCESS_PAYMENTS',
      'VIEW_ANALYTICS', 'MANAGE_STAFF', 'MANAGE_EVENTS', 'HANDLE_INQUIRIES'
    ],
    TASK_TYPES: [
      'CHECK_IN_GUEST', 'CHECK_OUT_GUEST', 'CLEAN_ROOM', 'HANDLE_INQUIRY',
      'MAINTENANCE_REQUEST', 'EVENT_SETUP', 'CONCIERGE_SERVICE'
    ],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 4,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6
    }
  },
  SUSTAINABILITY_CONFIG: {
    CERTIFICATIONS: ['LEED', 'GREEN_KEY', 'ECO_CERT', 'CARBON_NEUTRAL'],
    SUSTAINABLE_FEATURES: [
      'SOLAR_POWER', 'WATER_CONSERVATION', 'RECYCLING', 'ECO_FRIENDLY_PRODUCTS',
      'CARBON_OFFSET', 'LOCAL_SOURCING', 'ENERGY_EFFICIENT'
    ],
    CARBON_OFFSET_OPTIONS: {
      ENABLED: true,
      METHODS: ['TREE_PLANTING', 'RENEWABLE_ENERGY_CREDITS', 'CARBON_FUND']
    }
  },
  INTEGRATION_CONFIG: {
    SERVICE_INTEGRATIONS: ['MUNCH', 'MTXI', 'MTABLES', 'MPARK', 'MEVENTS', 'EXTERNAL_VENDORS'],
    AI_FEATURES: [
      'PERSONALIZED_RECOMMENDATIONS', // Suggests properties based on preferences
      'PRICE_OPTIMIZATION', // Dynamic pricing adjustments
      'CHECK_IN_OUT_SCHEDULING', // Optimizes check-in/out times
      'SUSTAINABILITY_SCORE', // Ranks properties by eco-friendliness
      'LOCAL_EXPERIENCE_SUGGESTIONS' // Curates local dining, transport, and events
    ],
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'whatsapp', 'x', 'telegram']
  },
  NOTIFICATION_TYPES: {
    STAY_CONFIRMATION: 'STAY_CONFIRMATION',
    STAY_CANCELLATION: 'STAY_CANCELLATION',
    CHECK_IN_REMINDER: 'CHECK_IN_REMINDER',
    CHECK_OUT_REMINDER: 'CHECK_OUT_REMINDER',
    PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
    STAY_UPCOMING: 'STAY_UPCOMING',
    STAY_DISPUTE: 'STAY_DISPUTE',
    MERCHANT_BOOKING_UPDATE: 'MERCHANT_BOOKING_UPDATE',
    SOCIAL_MEDIA_POST: 'SOCIAL_MEDIA_POST',
    SUSTAINABILITY_IMPACT: 'SUSTAINABILITY_IMPACT'
  },
  ANALYTICS_CONFIG: {
    METRICS: [
      'OCCUPANCY_RATE', 'AVERAGE_STAY_DURATION', 'REVENUE_PER_ROOM', 'GUEST_SATISFACTION',
      'SUSTAINABILITY_IMPACT', 'CHECK_IN_EFFICIENCY', 'EVENT_BOOKING_USAGE'
    ],
    REPORT_FORMATS: ['PDF', 'CSV', 'JSON', 'DASHBOARD'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      TARGET_OCCUPANCY_PERCENTAGE: 80,
      MAX_CHECK_IN_TIME_MINUTES: 5
    }
  },
  COMPLIANCE_CONFIG: {
    REGULATORY_REQUIREMENTS: ['HOTEL_LICENSE', 'FIRE_SAFETY', 'ACCESSIBILITY', 'HEALTH_SANITATION'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'CHECK_IN_PROCESSED',
      'PAYMENT_PROCESSED', 'REFUND_PROCESSED', 'DISPUTE_RESOLVED', 'SUSTAINABILITY_AUDIT'
    ]
  },
  ERROR_TYPES: [
    'INVALID_ROOM', 'ROOM_NOT_AVAILABLE', 'INVALID_BOOKING_DURATION', 'PAYMENT_FAILED',
    'CANCELLATION_NOT_ALLOWED', 'EXTENSION_NOT_ALLOWED', 'INVALID_LOCATION',
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'BOOKING_NOT_FOUND',
    'WALLET_INSUFFICIENT_FUNDS'
  ],
  SUCCESS_MESSAGES: [
    'STAY_BOOKED', 'STAY_CANCELLED', 'STAY_EXTENDED', 'CHECK_IN_COMPLETED',
    'PAYMENT_PROCESSED', 'REFUND_PROCESSED', 'MERCHANT_BOOKING_UPDATED',
    'SOCIAL_POST_SHARED', 'SUSTAINABILITY_IMPACT_RECORDED'
  ]
};