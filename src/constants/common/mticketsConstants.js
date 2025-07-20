'use strict';

/**
 * mticketsConstants.js
 *
 * Defines constants for the mtickets ticket booking system, covering ticket types,
 * booking configurations, payment settings, staff roles, analytics, notifications,
 * and compliance for seamless integration with other services.
 *
 * Last Updated: July 17, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'ticket_provider',
  TICKET_CONFIG: {
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
    MAX_ACTIVE_TICKET_BOOKINGS_PER_CUSTOMER: 10,
    MAX_TICKETS_PER_EVENT: 10000,
    MIN_TICKETS_PER_EVENT: 1
  },
  TICKET_TYPES: {
    CATEGORIES: ['EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER'],
    ACCESS_METHODS: ['QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'PHYSICAL_TICKET', 'NFC'],
    TICKET_STATUSES: ['AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED'],
    TICKET_DETAILS_FIELDS: {
      MANDATORY: ['TICKET_TYPE', 'EVENT_ID', 'PRICE', 'AVAILABILITY'],
      OPTIONAL: ['SEAT_NUMBER', 'ENTRY_TIME', 'ACCESS_METHOD', 'DIETARY_PREFERENCES', 'ACCESSIBILITY_FEATURES']
    }
  },
  BOOKING_CONFIG: {
    BOOKING_STATUSES: ['PENDING', 'CONFIRMED', 'USED', 'CANCELLED', 'NO_SHOW'],
    BOOKING_TYPES: ['SINGLE', 'GROUP', 'SEASON_PASS', 'VIP'],
    ENTRY_METHODS: ['MOBILE_APP', 'QR_CODE', 'NFC', 'MANUAL'],
    BOOKING_POLICIES: {
      MIN_BOOKING_LEAD_TIME_HOURS: 1,
      MAX_BOOKING_LEAD_TIME_DAYS: 365,
      CANCELLATION_WINDOW_HOURS: 24,
      MAX_TICKETS_PER_BOOKING: 20,
      DEFAULT_DISCOUNT_PERCENTAGE: 10,
      GROUP_DISCOUNT_THRESHOLD: 10 // Tickets for group discount eligibility
    },
    TICKET_MANAGEMENT: {
      MIN_TICKET_PRICE: 1,
      MAX_TICKET_PRICE: 5000,
      WAITLIST_LIMIT: 100,
      AI_TICKET_ALLOCATION: true // Optimizes ticket availability
    }
  },
  PAYMENT_CONFIG: {
    PAYMENT_METHODS: ['CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'MOBILE_MONEY', 'CRYPTO'],
    PAYMENT_STATUSES: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
    TRANSACTION_TYPES: ['TICKET_PURCHASE', 'REFUND', 'MERCHANT_PAYOUT', 'GROUP_PAYMENT'],
    PRICING_SETTINGS: {
      MIN_TICKET_PRICE: 1,
      MAX_TICKET_PRICE: 5000,
      DISCOUNT_TYPES: ['EARLY_BIRD', 'GROUP', 'LOYALTY', 'PROMO_CODE', 'EVENT_BUNDLE'],
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
      AUTO_TIP_SUGGESTION: true, // AI-driven tip suggestions based on ticket price
      TIP_CURRENCY: 'same_as_booking', // Matches booking currency
      TRANSACTION_LIMIT_PER_DAY: 50
    }
  },
  STAFF_CONFIG: {
    ROLES: ['TICKET_AGENT', 'EVENT_COORDINATOR', 'MANAGER', 'CUSTOMER_SUPPORT'],
    PERMISSIONS: [
      'MANAGE_TICKET_BOOKINGS', 'PROCESS_TICKET_SALES', 'HANDLE_INQUIRIES',
      'VIEW_ANALYTICS', 'MANAGE_STAFF', 'COORDINATE_EVENTS', 'PROCESS_REFUNDS'
    ],
    TASK_TYPES: [
      'PROCESS_TICKET_SALE', 'CHECK_TICKET', 'HANDLE_INQUIRY', 'SETUP_EVENT',
      'COORDINATE_VENDORS', 'PROCESS_REFUND'
    ],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 4,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6
    }
  },
  INTEGRATION_CONFIG: {
    SERVICE_INTEGRATIONS: ['MUNCH', 'MTXI', 'MTABLES', 'MPARK', 'MSTAYS', 'MEVENTS', 'EXTERNAL_VENDORS'],
    AI_FEATURES: [
      'TICKET_RECOMMENDATIONS', // Suggests tickets based on preferences
      'PRICE_OPTIMIZATION', // Dynamic pricing adjustments
      'EVENT_SCHEDULING', // Optimizes event and ticket schedules
      'BUNDLE_SUGGESTIONS' // Suggests service bundles (e.g., ticket + stay + transport)
    ],
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'whatsapp', 'x', 'telegram']
  },
  NOTIFICATION_TYPES: {
    TICKET_CONFIRMATION: 'TICKET_CONFIRMATION',
    TICKET_CANCELLATION: 'TICKET_CANCELLATION',
    EVENT_REMINDER: 'EVENT_REMINDER',
    PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
    TICKET_UPCOMING: 'TICKET_UPCOMING',
    TICKET_DISPUTE: 'TICKET_DISPUTE',
    MERCHANT_TICKET_UPDATE: 'MERCHANT_TICKET_UPDATE',
    SOCIAL_MEDIA_POST: 'SOCIAL_MEDIA_POST'
  },
  ANALYTICS_CONFIG: {
    METRICS: [
      'TICKET_SALES', 'EVENT_ATTENDANCE', 'REVENUE_PER_EVENT', 'CUSTOMER_SATISFACTION',
      'TICKET_CANCELLATION_RATE', 'BUNDLE_UTILIZATION'
    ],
    REPORT_FORMATS: ['PDF', 'CSV', 'JSON', 'DASHBOARD'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      TARGET_SALES_PERCENTAGE: 80,
      MAX_TICKET_PROCESSING_TIME_MINUTES: 5
    }
  },
  COMPLIANCE_CONFIG: {
    REGULATORY_REQUIREMENTS: ['TICKET_LICENSE', 'EVENT_SAFETY', 'ACCESSIBILITY', 'DATA_PROTECTION'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'TICKET_SOLD', 'TICKET_CANCELLED', 'PAYMENT_PROCESSED', 'REFUND_PROCESSED',
      'EVENT_UPDATED', 'DISPUTE_RESOLVED'
    ]
  },
  ERROR_TYPES: [
    'INVALID_TICKET', 'TICKET_NOT_AVAILABLE', 'INVALID_BOOKING_DURATION', 'PAYMENT_FAILED',
    'CANCELLATION_NOT_ALLOWED', 'INVALID_LOCATION', 'INVALID_MERCHANT_TYPE',
    'PERMISSION_DENIED', 'BOOKING_NOT_FOUND', 'WALLET_INSUFFICIENT_FUNDS'
  ],
  SUCCESS_MESSAGES: [
    'TICKET_BOOKED', 'TICKET_CANCELLED', 'PAYMENT_PROCESSED', 'REFUND_PROCESSED',
    'MERCHANT_TICKET_UPDATED', 'SOCIAL_POST_SHARED'
  ]
};