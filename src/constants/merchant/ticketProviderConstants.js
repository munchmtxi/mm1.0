'use strict';

/**
 * ticketProviderConstants.js
 *
 * Defines constants specific to the ticket_provider merchant type, covering business
 * operations, ticket management, staff roles, analytics, notifications, and compliance
 * for ticket booking services integrated with mtickets.
 *
 * Last Updated: July 17, 2025
 */

module.exports = {
  MERCHANT_TYPE: 'ticket_provider',
  BUSINESS_SETTINGS: {
    DEFAULT_BOOKINGS_ENABLED: true,
    DEFAULT_TICKET_SALE_ENABLED: true,
    DEFAULT_PREP_TIME_MINUTES: 5, // For ticket processing
    DEFAULT_UI: 'ticketing',
    DEFAULT_SERV-English: ['mtickets', 'mevents'],
    AI_ENABLED_FEATURES: [
      'ticket_optimization', // Optimizes ticket availability
      'price_optimization', // Dynamic pricing
      'event_recommendations', // Personalized event suggestions
      'bundle_suggestions', // Suggests service bundles
      'attendance_prediction' // Predicts event attendance
    ],
    SOCIAL_MEDIA_INTEGRATION: ['facebook', 'instagram', 'x', 'linkedin', 'tiktok', 'telegram'],
    DEFAULT_TASKS: ['manage_ticket_bookings', 'process_ticket_sales', 'handle_inquiries', 'coordinate_events']
  },
  TICKET_SETTINGS: {
    MAX_EVENTS_PER_MERCHANT: 500,
    MAX_TICKETS_PER_EVENT: 10000,
    MIN_TICKETS_PER_EVENT: 1,
    TICKET_CATEGORIES: ['EVENT', 'ATTRACTION', 'TRANSPORT', 'FESTIVAL', 'CONCERT', 'SPORTS', 'TOUR', 'THEATER'],
    TICKET_STATUSES: ['AVAILABLE', 'RESERVED', 'SOLD', 'USED', 'CANCELLED', 'REFUNDED'],
    ACCESS_METHODS: ['QR_CODE', 'BARCODE', 'DIGITAL_PASS', 'PHYSICAL_TICKET', 'NFC']
  },
  STAFF_CONSTANTS: {
    DEFAULT_ROLES: ['manager', 'ticket_agent', 'event_coordinator', 'customer_support'],
    DEFAULT_PERMISSIONS: [
      'manage_ticket_bookings', 'process_ticket_sales', 'handle_inquiries',
      'coordinate_events', 'view_analytics', 'process_refunds'
    ],
    DEFAULT_TASK_TYPES: [
      'process_ticket_sale', 'check_ticket', 'handle_inquiry', 'setup_event',
      'coordinate_vendors', 'process_refund'
    ],
    SHIFT_SETTINGS: {
      MIN_SHIFT_HOURS: 4,
      MAX_SHIFT_HOURS: 12,
      MAX_SHIFTS_PER_WEEK: 6,
      AI_SHIFT_SCHEDULING: true
    }
  },
  WALLET_CONSTANTS: {
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded'],
    PAYOUT_SETTINGS: {
      MIN_PAYOUT_AMOUNT: 10,
      MAX_PAYOUT_AMOUNT: 10000,
      MAX_PAYOUT_FREQUENCY_DAYS: 30,
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT', 'BNB'],
      PAYOUT_PROCESSING_TIME_HOURS: 24
    }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'ticket_sales', 'event_attendance', 'revenue_per_event', 'customer_satisfaction',
      'ticket_cancellation_rate', 'bundle_utilization'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      TARGET_SALES_PERCENTAGE: 80,
      MAX_TICKET_PROCESSING_TIME_MINUTES: 5
    }
  },
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'ticket_confirmation', 'event_reminder', 'payment_confirmation', 'ticket_update',
      'customer_inquiry', 'social_media_post'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high'],
    MAX_NOTIFICATIONS_PER_HOUR: 15,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 60
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['ticket_license', 'event_safety', 'accessibility', 'data_protection'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: ['ticket_sold', 'payment_processed', 'ticket_cancelled', 'event_updated']
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_ACCESSIBILITY_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands', 'accessible_seating'],
    FONT_SIZE_RANGE: { min: 12, max: 24 }
  },
  SOCIAL_MEDIA_CONSTANTS: {
    SUPPORTED_PLATFORMS: ['x', 'instagram', 'facebook', 'linkedin', 'tiktok', 'telegram'],
    POST_TYPES: ['promotion', 'update', 'event', 'review', 'ticket_sale'],
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
  },
  ERROR_CODES: [
    'INVALID_MERCHANT_TYPE', 'PERMISSION_DENIED', 'PAYMENT_FAILED', 'INVALID_TICKET_TYPE',
    'TICKET_NOT_AVAILABLE', 'INVALID_EVENT', 'INVALID_ACCESS_METHOD'
  ],
  SUCCESS_MESSAGES: [
    'ticket_sold', 'payment_completed', 'ticket_status_updated', 'social_post_shared',
    'event_updated'
  ]
};