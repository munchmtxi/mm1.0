'use strict';

module.exports = {
  MERCHANT_TYPE: 'PARKING_LOT',
  PARKING_CONFIG: {
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
    SUPPORTED_MAP_PROVIDERS: {
      US: 'google_maps', GB: 'google_maps', EU: 'openstreetmap', CA: 'google_maps', AU: 'google_maps',
      MW: 'openstreetmap', TZ: 'openstreetmap', KE: 'openstreetmap', MZ: 'openstreetmap',
      ZA: 'openstreetmap', IN: 'google_maps', CM: 'openstreetmap', GH: 'openstreetmap',
      MX: 'google_maps', ER: 'openstreetmap'
    },
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'],
    DEFAULT_TIMEZONE: 'UTC',
    MAX_ACTIVE_PARKING_BOOKINGS_PER_CUSTOMER: 3,
    MAX_LOTS_PER_MERCHANT: 100,
    MAX_SPACES_PER_LOT: 2000,
    MIN_SPACES_PER_LOT: 1
  },
  SPACE_CONFIG: {
    SPACE_TYPES: ['STANDARD', 'ACCESSIBLE', 'EV_CHARGING', 'OVERSIZED', 'PREMIUM', 'PRIVATE', 'MOTORBIKE'],
    SPACE_STATUSES: ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    SECURITY_FEATURES: ['CCTV', 'GUARDED', 'GATED', 'LIGHTING', 'PATROLLED', 'BIOMETRIC', 'NONE'],
    ACCESS_TYPES: ['KEYPAD', 'TICKET', 'APP', 'MANUAL', 'LICENSE_PLATE', 'NFC'],
    EGRESS_TYPES: ['AUTOMATIC', 'MANUAL', 'OPEN'],
    SPACE_DETAILS_FIELDS: {
      MANDATORY: ['SPACE_TYPE', 'LOCATION', 'AVAILABILITY'],
      OPTIONAL: [
        'SECURITY_FEATURES', 'ACCESS_TYPE', 'EGRESS_TYPE', 'DIMENSIONS', 'HEIGHT_RESTRICTION',
        'SURFACE_TYPE', 'PROXIMITY', 'EV_CHARGING_SPECS', 'ACCESSIBILITY_FEATURES'
      ]
    }
  },
  BOOKING_CONFIG: {
    BOOKING_STATUSES: ['PENDING', 'CONFIRMED', 'OCCUPIED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'],
    BOOKING_TYPES: ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'EVENT'],
    CHECK_IN_METHODS: ['QR_CODE', 'LICENSE_PLATE', 'MANUAL', 'NFC'],
    BOOKING_POLICIES: {
      MIN_BOOKING_MINUTES: 15,
      MAX_BOOKING_DAYS: 365,
      CANCELLATION_WINDOW_HOURS: 1,
      EXTENSION_LIMIT_MINUTES: 120,
      DEFAULT_DEPOSIT_PERCENTAGE: 5
    },
    BOOKING_LENGTHS: {
      MINIMUM: { HOURLY: 15, DAILY: 1, WEEKLY: 7, MONTHLY: 30, EVENT: 1 },
      MAXIMUM: { HOURLY: 24 * 60, DAILY: 7, WEEKLY: 28, MONTHLY: 365, EVENT: 7 }
    },
    SPACE_MANAGEMENT: {
      MIN_SPACE_CAPACITY: 1,
      MAX_SPACE_CAPACITY: 1,
      DEFAULT_TURNOVER_MINUTES: 10,
      WAITLIST_LIMIT: 100
    }
  },
  PAYMENT_CONFIG: {
    PAYMENT_METHODS: ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'MOBILE_MONEY', 'CRYPTO'],
    PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    TRANSACTION_TYPES: ['PARKING_PAYMENT', 'REFUND', 'MERCHANT_PAYOUT'],
    PRICING_SETTINGS: {
      MIN_HOURLY_RATE: 0.5,
      MAX_HOURLY_RATE: 75,
      MIN_DAILY_RATE: 3,
      MAX_DAILY_RATE: 300,
      DISCOUNT_TYPES: ['EARLY_BIRD', 'LONG_TERM', 'EVENT', 'REFERRAL', 'SOCIAL_MEDIA'],
      MAX_DISCOUNT_PERCENTAGE: 60
    },
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_FREQUENCY_DAYS: 30,
      SUPPORTED_PAYOUT_METHODS: ['BANK_TRANSFER', 'WALLET_TRANSFER', 'MOBILE_MONEY', 'CRYPTO'],
      PAYOUT_PROCESSING_TIME_HOURS: 24
    }
  },
  STAFF_CONFIG: {
    ROLES: ['PARKING_ATTENDANT', 'MANAGER', 'SECURITY', 'EVENT_COORDINATOR'],
    PERMISSIONS: [
      'MANAGE_PARKING_BOOKINGS', 'CHECK_IN_VEHICLE', 'MONITOR_SPACES', 'PROCESS_PAYMENTS',
      'VIEW_ANALYTICS', 'MANAGE_STAFF', 'MANAGE_EVENTS'
    ],
    TASK_TYPES: ['RESERVE_SPACE', 'CHECK_IN_VEHICLE', 'MONITOR_SPACE', 'RESOLVE_DISPUTE', 'EVENT_SETUP'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 3,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 7
    }
  },
  NOTIFICATION_TYPES: {
    PARKING_CONFIRMATION: 'PARKING_CONFIRMATION',
    PARKING_CANCELLATION: 'PARKING_CANCELLATION',
    PARKING_TIME_EXTENSION: 'PARKING_TIME_EXTENSION',
    PARKING_PAYMENT_CONFIRMED: 'PARKING_PAYMENT_CONFIRMED',
    PARKING_UPCOMING: 'PARKING_UPCOMING',
    PARKING_CHECK_IN: 'PARKING_CHECK_IN',
    PARKING_DISPUTE: 'PARKING_DISPUTE',
    MERCHANT_BOOKING_UPDATE: 'MERCHANT_BOOKING_UPDATE',
    SOCIAL_MEDIA_POST: 'SOCIAL_MEDIA_POST'
  },
  ANALYTICS_CONFIG: {
    METRICS: [
      'OCCUPANCY_RATE', 'AVERAGE_BOOKING_DURATION', 'REVENUE_PER_SPACE', 'PEAK_USAGE_HOURS',
      'CUSTOMER_RETENTION', 'EVENT_PARKING_USAGE'
    ],
    REPORT_FORMATS: ['PDF', 'CSV', 'JSON', 'DASHBOARD'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      TARGET_OCCUPANCY_PERCENTAGE: 85,
      MAX_CHECK_IN_TIME_MINUTES: 3
    }
  },
  COMPLIANCE_CONFIG: {
    REGULATORY_REQUIREMENTS: ['BUSINESS_LICENSE', 'PARKING_PERMIT', 'FIRE_SAFETY', 'ACCESSIBILITY'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'BOOKING_CREATED', 'BOOKING_UPDATED', 'BOOKING_CANCELLED', 'CHECK_IN_PROCESSED',
      'PAYMENT_PROCESSED', 'REFUND_PROCESSED', 'DISPUTE_RESOLVED', 'EVENT_PARKING'
    ]
  },
  TIPPING_CONSTANTS: {
    TIPPABLE_ROLES: ['staff', 'merchant'],
    TIP_METHODS: ['percentage', 'fixed_amount', 'custom'],
    TIP_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    TIP_SETTINGS: {
      MIN_TIP_AMOUNT: 0.5,
      MAX_TIP_AMOUNT: 50,
      DEFAULT_TIP_PERCENTAGES: [5, 10, 15],
      MAX_TIPS_PER_BOOKING: 2, // One per role (staff, merchant)
      TIP_DISTRIBUTION: {
        staff: 'direct',   // Tip goes directly to assigned staff
        merchant: 'pooled' // Tip pooled for merchant staff
      },
      AUTO_TIP_SUGGESTION: true, // AI-driven tip suggestions based on parking duration/service
      TIP_CURRENCY: 'same_as_booking', // Matches booking currency
      TRANSACTION_LIMIT_PER_DAY: 50
    }
  },
  ERROR_TYPES: [
    'INVALID_PARKING_SPOT', 'PARKING_NOT_AVAILABLE', 'INVALID_BOOKING_DURATION', 'PAYMENT_FAILED',
    'CANCELLATION_NOT_ALLOWED', 'EXTENSION_NOT_ALLOWED', 'INVALID_LOCATION', 'INVALID_MERCHANT_TYPE',
    'PERMISSION_DENIED', 'PARKING_BOOKING_NOT_FOUND', 'WALLET_INSUFFICIENT_FUNDS'
  ],
  SUCCESS_MESSAGES: [
    'PARKING_BOOKED', 'PARKING_CANCELLED', 'PARKING_TIME_EXTENDED', 'PARKING_CHECKED_IN',
    'PARKING_PAYMENT_PROCESSED', 'PARKING_REFUND_PROCESSED', 'MERCHANT_BOOKING_UPDATED', 'SOCIAL_POST_SHARED'
  ]
};
