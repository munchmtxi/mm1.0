'use strict';

module.exports = {
  MTABLES_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'caterer'],
    BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
    TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
    CHECK_IN_METHODS: ['qr_code', 'manual', 'auto', 'biometric'],
    BOOKING_POLICIES: {
      MIN_BOOKING_HOURS: 1,
      MAX_BOOKING_HOURS: 4,
      CANCELLATION_WINDOW_HOURS: 12,
      EXTENSION_LIMIT_MINUTES: 120,
      MIN_DEPOSIT_PERCENTAGE: 10,
      MAX_DEPOSIT_PERCENTAGE: 50
    },
    PRE_ORDER_SETTINGS: {
      MAX_GROUP_SIZE: 30,
      MIN_PRE_ORDER_LEAD_TIME_MINUTES: 15,
      MAX_PRE_ORDER_ITEMS: 100,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo']
    },
    TABLE_MANAGEMENT: {
      MIN_TABLE_CAPACITY: 1,
      MAX_TABLE_CAPACITY: 30,
      DEFAULT_TURNOVER_MINUTES: 60,
      MAX_TABLES_PER_MERCHANT: 200,
      WAITLIST_LIMIT: 100
    },
    ANALYTICS_METRICS: ['booking_rate', 'no_show_rate', 'turnover_time', 'pre_order_uptake']
  },
  MTXI_CONSTANTS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    RIDE_TYPES: ['standard', 'shared', 'premium'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 6,
      MIN_RIDE_DISTANCE_KM: 0.5,
      MAX_RIDE_DISTANCE_KM: 100,
      CANCELLATION_WINDOW_MINUTES: 3,
      TIMELY_PICKUP_WINDOW_MINUTES: 3,
      MAX_WAIT_TIME_MINUTES: 8
    },
    DRIVER_ASSIGNMENT: {
      MAX_ASSIGNMENT_RADIUS_KM: 15,
      MAX_ASSIGNMENT_ATTEMPTS: 5,
      ASSIGNMENT_TIMEOUT_SECONDS: 20,
      AI_ASSIGNMENT_ENABLED: true
    },
    ANALYTICS_METRICS: ['ride_completion_rate', 'driver_utilization', 'cancellation_rate', 'shared_ride_uptake']
  },
  MPARK_CONSTANTS: {
    PARKING_STATUSES: ['available', 'occupied', 'reserved', 'disabled', 'maintenance'],
    PARKING_TYPES: ['public', 'private', 'vip', 'disabled'],
    PARKING_SETTINGS: {
      MIN_PARKING_DURATION_MINUTES: 15,
      MAX_PARKING_DURATION_HOURS: 24,
      CANCELLATION_WINDOW_MINUTES: 5,
      MAX_SLOTS_PER_LOT: 1000,
      RESERVATION_LEAD_TIME_MINUTES: 10
    },
    PRICING_SETTINGS: {
      MIN_HOURLY_RATE: 1,
      MAX_HOURLY_RATE: 50,
      DYNAMIC_PRICING_ENABLED: true,
      VIP_PREMIUM_PERCENTAGE: 20
    },
    SLOT_ASSIGNMENT: {
      MAX_ASSIGNMENT_RADIUS_KM: 5,
      AI_ASSIGNMENT_ENABLED: true
    },
    ANALYTICS_METRICS: ['slot_occupancy_rate', 'reservation_rate', 'turnover_time', 'revenue_per_slot']
  },
  MUNCH_CONSTANTS: {
    SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
    ORDER_STATUSES: ['pending', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'],
    DELIVERY_STATUSES: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled'],
    ORDER_SETTINGS: {
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo'],
      MAX_ORDER_ITEMS: 100,
      MIN_ORDER_AMOUNT: 5,
      MAX_ORDER_AMOUNT: 2000,
      CANCELLATION_WINDOW_MINUTES: 5
    },
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 20,
      MIN_DELIVERY_TIME_MINUTES: 10,
      MAX_DELIVERY_TIME_MINUTES: 60,
      BATCH_DELIVERY_LIMIT: 10,
      MAX_DELIVERY_ATTEMPTS: 3
    },
    INVENTORY_SETTINGS: {
      LOW_STOCK_THRESHOLD_PERCENTAGE: 15,
      RESTOCK_ALERT_FREQUENCY_HOURS: 12,
      MAX_INVENTORY_ITEMS: 2000
    },
    ANALYTICS_METRICS: ['order_completion_rate', 'delivery_time', 'inventory_turnover', 'dietary_filter_usage']
  },
  MEVENTS_CONSTANTS: {
    EVENT_STATUSES: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
    EVENT_TYPES: ['private', 'public', 'corporate'],
    EVENT_SETTINGS: {
      MAX_PARTICIPANTS: 200,
      MIN_LEAD_TIME_HOURS: 12,
      MAX_SERVICES_PER_EVENT: 4,
      CANCELLATION_WINDOW_HOURS: 24
    },
    GROUP_BOOKING_SETTINGS: {
      MAX_GROUP_SIZE: 100,
      MIN_DEPOSIT_PERCENTAGE: 15,
      MAX_PAYMENT_SPLITS: 20
    },
    ANALYTICS_METRICS: ['event_completion_rate', 'participant_engagement', 'group_booking_rate', 'service_usage']
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['user_update', 'financial_update', 'compliance_alert', 'support_ticket', 'platform_announcement', 'security_alert', 'analytics_report'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  SUPPORT_CONSTANTS: {
    ISSUE_TYPES: ['booking', 'order', 'ride', 'delivery', 'parking', 'payment', 'wallet', 'compliance', 'security', 'platform', 'other'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology', 'user_suspension', 'warning'],
    SUPPORT_RESPONSE_TIME_HOURS: { STANDARD: 12, PRIORITY: 4, URGENT: 1 },
    TICKET_PRIORITIES: ['low', 'medium', 'high', 'critical'],
    ESCALATION_LEVELS: ['tier_1', 'tier_2', 'tier_3'],
    ANALYTICS_METRICS: ['ticket_resolution_time', 'escalation_rate', 'customer_satisfaction', 'merchant_satisfaction']
  },
  COMPLIANCE_CONSTANTS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'drivers_license', 'vehicle_insurance', 'halal_certification', 'tax_registration'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
    AUDIT_FREQUENCY_DAYS: 90,
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_TYPES: ['financial', 'operational', 'security', 'compliance'],
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  SECURITY_CONSTANTS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    POST_QUANTUM_ALGORITHM: 'Kyber-512',
    TOKEN_EXPIRY_MINUTES: 30,
    PERMISSION_LEVELS: ['read', 'write', 'admin'],
    MFA_METHODS: ['sms', 'email', 'authenticator_app', 'biometric'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    AUDIT_LOG_RETENTION_DAYS: 365
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['user_activity', 'financial_performance', 'support_ticket_resolution', 'platform_health', 'cross_vertical_usage', 'parking_usage'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    AI_ANALYTICS_ENABLED: true
  },
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 200,
    SYNC_INTERVAL_MINUTES: 3,
    WEBSOCKET_HEARTBEAT_SECONDS: 20,
    MAX_OFFLINE_TRANSACTIONS: 200
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands'],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'paleo']
  },
  TRAINING_CONSTANTS: {
    TRAINING_MODULES: ['platform_overview', 'user_management', 'financial_operations', 'compliance_audits', 'support_operations', 'security_protocols', 'analytics_reporting'],
    CERTIFICATION_STATUSES: ['pending', 'completed', 'expired'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    TRAINING_FORMATS: ['video', 'document', 'interactive'],
    ANALYTICS_METRICS: ['training_completion_rate', 'certification_renewal']
  },
  ERROR_CODES: [
    'INVALID_BOOKING', 'INVALID_RIDE', 'INVALID_ORDER', 'SUPPORT_TICKET_FAILED',
    'NOTIFICATION_DELIVERY_FAILED', 'COMPLIANCE_VIOLATION', 'ANALYTICS_GENERATION_FAILED',
    'OFFLINE_MODE_UNAVAILABLE', 'SECURITY_INCIDENT', 'TRAINING_MODULE_NOT_FOUND'
  ],
  SUCCESS_MESSAGES: [
    'booking_updated', 'ride_updated', 'order_updated', 'support_ticket_resolved',
    'notification_sent', 'compliance_audit_completed', 'analytics_report_exported',
    'security_enhancement_applied', 'training_completed'
  ]
};