'use strict';

/**
 * parkingLotConstants.js
 *
 * Defines constants for the Parking Lot merchant type, supporting parking space bookings
 * via the mpark service with space types, security, and access details. Integrates wallet
 * operations, staff management, analytics, notifications, and compliance. Supports 15 countries
 * with localization handled by localizationConstants.js and aligns with driverConstants.js,
 * staffConstants.js, customerConstants.js, admin constants, and merchantConstants.js.
 *
 * Last Updated: July 10, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'parking_lot',
  BUSINESS_SETTINGS: {
    bookings: true,
    delivery: false,
    pickup: false,
    prepTimeMinutes: 0,
    ui: 'parking_management',
    tasks: ['reserve_space', 'check_in_vehicle', 'monitor_space', 'resolve_dispute', 'customer_support', 'process_payments'],
    services: ['mpark'],
    SPACE_CONFIG: {
      SPACE_TYPES: ['standard', 'accessible', 'ev_charging', 'oversized', 'premium', 'private', 'motorbike'],
      SECURITY_FEATURES: ['cctv', 'guarded', 'gated', 'lighting', 'patrolled', 'none'],
      ACCESS_TYPES: ['keypad', 'ticket', 'app', 'manual', 'license_plate', 'nfc'],
      EGRESS_TYPES: ['automatic', 'manual', 'open'],
      QUANTITY_LIMITS: {
        MAX_SPACES_PER_LOT: 2000,
        MIN_SPACES_PER_LOT: 1,
        MAX_LOTS_PER_MERCHANT: 100
      },
      BOOKING_LENGTHS: {
        MINIMUM: { HOURLY: 15, DAILY: 1, WEEKLY: 7, MONTHLY: 30 },
        MAXIMUM: { HOURLY: 24 * 60, DAILY: 14, WEEKLY: 8, MONTHLY: 24 }
      },
      SPACE_DETAILS_FIELDS: {
        MANDATORY: ['space_type', 'location', 'availability'],
        OPTIONAL: ['security_features', 'access_type', 'egress_type', 'dimensions', 'height_restriction', 'surface_type', 'proximity', 'ev_charging_specs']
      }
    }
  },
  BRANCH_SETTINGS: {
    MAX_BRANCHES: 100,
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60
  },
  MPARK_CONSTANTS: {
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    SPACE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance', 'disabled'],
    BOOKING_TYPES: ['hourly', 'daily', 'weekly', 'monthly'],
    CHECK_IN_METHODS: ['qr_code', 'license_plate', 'manual', 'nfc'],
    BOOKING_POLICIES: {
      MIN_BOOKING_MINUTES: 15,
      MAX_BOOKING_DAYS: 730,
      CANCELLATION_WINDOW_HOURS: 1,
      DEFAULT_DEPOSIT_PERCENTAGE: 5
    },
    SPACE_MANAGEMENT: {
      MIN_SPACE_CAPACITY: 1,
      MAX_SPACE_CAPACITY: 1,
      DEFAULT_TURNOVER_MINUTES: 10,
      WAITLIST_LIMIT: 100
    },
    PRICING_SETTINGS: {
      MIN_HOURLY_RATE: 0.5,
      MAX_HOURLY_RATE: 100,
      MIN_DAILY_RATE: 2,
      MAX_DAILY_RATE: 500,
      DISCOUNT_TYPES: ['early_bird', 'long_term', 'event', 'loyalty'],
      MAX_DISCOUNT_PERCENTAGE: 75
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
    ROLES: ['car_park_operative', 'manager', 'security', 'customer_service'],
    PERMISSIONS: [
      'manage_parking_bookings', 'check_in_vehicle', 'monitor_spaces', 'process_payments', 'view_analytics',
      'manage_staff', 'handle_complaints', 'assist_parking', 'report_issues'
    ],
    TASK_TYPES: ['reserve_space', 'check_in_vehicle', 'monitor_space', 'resolve_dispute', 'customer_support', 'process_payment', 'parking_assist', 'report_issue'],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 2,
      MAX_SHIFT_HOURS: 14,
      MAX_SHIFTS_PER_WEEK: 7,
      AI_SHIFT_SCHEDULING: true
    }
  },
  ANALYTICS_CONSTANTS: {
    SUPPORTED_FEATURES: ['occupancy_tracking', 'revenue_analysis', 'booking_trends', 'customer_behavior', 'space_utilization'],
    METRICS: ['occupancy_rate', 'average_booking_duration', 'revenue_per_space', 'peak_usage_hours', 'customer_retention', 'parking_compliance'],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      TARGET_OCCUPANCY_PERCENTAGE: 85,
      MAX_CHECK_IN_TIME_MINUTES: 3
    }
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'booking_confirmation', 'check_in_confirmation', 'payment_confirmation', 'space_availability_alert',
      'support_response', 'social_media_post', 'parking_alert'
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
    REGULATORY_REQUIREMENTS: ['business_license', 'parking_permit', 'fire_safety'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: ['booking_confirmed', 'check_in_processed', 'payment_processed', 'parking_booking_confirmed']
  },
  GAMIFICATION_CONSTANTS: {
    GAMIFICATION_ACTIONS: [
      { action: 'booking_confirmed', name: 'Booking Confirmed', points: 10 },
      { action: 'check_in_processed', name: 'Check-In Processed', points: 5 },
      { action: 'customer_review_received', name: 'Customer Review Received', points: 10 },
      { action: 'social_post_shared', name: 'Social Post Shared', points: 8 },
      { action: 'parking_booking_confirmed', name: 'Parking Booking Confirmed', points: 10 }
    ],
    GAMIFICATION_SETTINGS: {
      MAX_DAILY_ACTIONS: 50,
      POINTS_EXPIRY_DAYS: 365,
      LEADERBOARD_TYPES: ['global', 'regional', 'merchant_specific'],
      REWARD_CATEGORIES: ['cash_bonus', 'crypto_rewards', 'free_services', 'priority_bookings'],
      AI_PERSONALIZATION: true
    }
  },
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'PARKING_BOOKING_NOT_FOUND', 'INVALID_SPACE_TYPE', 'INVALID_PARKING_ASSIGNMENT'
  ],
  SUCCESS_MESSAGES: [
    'parking_booking_confirmed', 'payment_completed', 'check_in_processed', 'social_post_shared', 'parking_assisted'
  ]
};