'use strict';

module.exports = {
  ROLE: 'mtxi_admin',
  DESCRIPTION: 'Manages mtxi ride-sharing operations, driver verification, vehicle compliance, and parking integration.',
  PERMISSIONS: {
    manageRides: ['read', 'write', 'cancel', 'assign'],
    manageDrivers: ['read', 'write', 'verify', 'suspend'],
    manageVehicles: ['read', 'write', 'verify'],
    manageSupport: ['read', 'write', 'escalate'],
    manageAnalytics: ['read', 'export'],
    manageCompliance: ['read', 'write', 'audit'],
    manageLogs: ['read', 'write'],
    manageParkingIntegration: ['read', 'write', 'assign']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app', 'biometric'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language', 'emergency_contact'] },
    PRIVACY_SETTINGS: { DATA_VISIBILITY: ['internal', 'anonymized'], LOG_ACCESS: ['audit_only', 'team'] }
  },
  RIDE_OPERATIONS: {
    RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    RIDE_TYPES: ['standard', 'shared', 'premium', 'accessible'],
    RIDE_SETTINGS: {
      MAX_PASSENGERS: 6,
      MIN_RIDE_DISTANCE_KM: 0.5,
      MAX_RIDE_DISTANCE_KM: 100,
      CANCELLATION_WINDOW_MINUTES: 3,
      TIMELY_PICKUP_WINDOW_MINUTES: 3,
      MAX_WAIT_TIME_MINUTES: 8,
      MIN_FARE: 2,
      MAX_FARE: 500,
      DYNAMIC_PRICING_ENABLED: true,
      SURGE_MULTIPLIER: { MIN: 1.0, MAX: 3.0 }
    },
    SHARED_RIDE_SETTINGS: {
      MAX_PASSENGERS_PER_SHARED_RIDE: 4,
      MAX_STOPS_PER_SHARED_RIDE: 3,
      MAX_DEVIATION_KM: 5
    },
    DRIVER_ASSIGNMENT: {
      MAX_ASSIGNMENT_RADIUS_KM: 15,
      MAX_ASSIGNMENT_ATTEMPTS: 5,
      ASSIGNMENT_TIMEOUT_SECONDS: 20,
      AI_ASSIGNMENT_ENABLED: true,
      PRIORITY_FACTORS: ['driver_rating', 'proximity', 'vehicle_type', 'availability']
    },
    REAL_TIME_TRACKING: {
      UPDATE_FREQUENCY_SECONDS: 10,
      GEOFENCE_RADIUS_KM: 0.5,
      MAP_PROVIDERS: ['google_maps', 'openstreetmap']
    }
  },
  DRIVER_MANAGEMENT: {
    DRIVER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'banned'],
    VERIFICATION_METHODS: ['document_upload', 'biometric', 'background_check'],
    DOCUMENT_TYPES: ['drivers_license', 'vehicle_insurance', 'vehicle_registration', 'identity_proof'],
    SUSPENSION_REASONS: ['policy_violation', 'low_rating', 'non_compliance', 'inactivity'],
    MIN_DRIVER_RATING: 3.5,
    MAX_DOCUMENT_UPLOADS: 5
  },
  VEHICLE_MANAGEMENT: {
    VEHICLE_STATUSES: ['active', 'inactive', 'maintenance', 'pending_inspection'],
    VEHICLE_TYPES: ['sedan', 'suv', 'van', 'accessible', 'premium'],
    INSPECTION_FREQUENCY_DAYS: 180,
    REQUIRED_CERTIFICATIONS: ['vehicle_insurance', 'vehicle_registration', 'safety_inspection'],
    MAX_VEHICLES_PER_DRIVER: 2
  },
  PARKING_INTEGRATION: {
    PARKING_STATUSES: ['available', 'occupied', 'reserved', 'disabled', 'maintenance'],
    PARKING_TYPES: ['public', 'private', 'vip', 'disabled'],
    PARKING_SETTINGS: {
      MAX_SLOTS_PER_LOT: 1000,
      RESERVATION_LEAD_TIME_MINUTES: 10,
      MAX_PARKING_DURATION_HOURS: 24
    },
    SLOT_ASSIGNMENT: {
      MAX_ASSIGNMENT_RADIUS_KM: 5,
      AI_ASSIGNMENT_ENABLED: true,
      PRIORITY_FACTORS: ['proximity', 'ride_destination', 'parking_type']
    },
    ANALYTICS_METRICS: ['slot_occupancy_rate', 'reservation_rate', 'turnover_time']
  },
  FINANCIAL_OPERATIONS: {
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'mobile_money', 'crypto'],
    TRANSACTION_TYPES: ['ride_payment', 'refund', 'driver_payout', 'fee'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded', 'disputed'],
    PAYOUT_SETTINGS: {
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'mobile_money', 'crypto'],
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT']
    },
    FRAUD_DETECTION: {
      MAX_SUSPICIOUS_TRANSACTIONS_PER_DAY: 10,
      TRANSACTION_VELOCITY_LIMIT: 15,
      IP_BLOCK_DURATION_HOURS: 12
    }
  },
  COMPLIANCE_OPERATIONS: {
    REGULATORY_REQUIREMENTS: ['drivers_license', 'vehicle_insurance', 'vehicle_registration', 'background_check', 'tax_registration'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
    AUDIT_FREQUENCY_DAYS: 90,
    CERTIFICATION_EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  SUPPORT_OPERATIONS: {
    ISSUE_TYPES: ['ride', 'driver', 'vehicle', 'payment', 'parking', 'platform', 'other'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'driver_suspension', 'warning'],
    SUPPORT_RESPONSE_TIME_HOURS: { STANDARD: 12, PRIORITY: 4, URGENT: 1 },
    TICKET_PRIORITIES: ['low', 'medium', 'high', 'critical'],
    ESCALATION_LEVELS: ['tier_1', 'tier_2', 'tier_3']
  },
  ANALYTICS_OPERATIONS: {
    METRICS: [
      'ride_completion_rate', 'driver_utilization', 'cancellation_rate', 'shared_ride_uptake',
      'parking_usage', 'driver_rating', 'customer_satisfaction'
    ],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      RIDE_COMPLETION_TIME_MINUTES: 60,
      DRIVER_RESPONSE_TIME_SECONDS: 30,
      API_RESPONSE_TIME_MS: 300,
      ERROR_RATE_PERCENTAGE: 0.5
    },
    DASHBOARD_TYPES: ['ride_operations', 'driver_performance', 'parking_integration'],
    EXPORT_LIMITS: { MAX_ROWS_CSV: 200000, MAX_PAGES_PDF: 100 },
    AI_ANALYTICS_ENABLED: true
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: [
      'ride_assignment', 'driver_update', 'vehicle_update', 'payment_update',
      'parking_assignment', 'compliance_alert', 'support_ticket', 'analytics_report', 'announcement'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  OPERATIONAL_CONSTANTS: {
    OFFLINE_CACHE_LIMIT_MB: 200,
    SYNC_INTERVAL_MINUTES: 3,
    WEBSOCKET_HEARTBEAT_SECONDS: 20,
    MAX_OFFLINE_TRANSACTIONS: 200,
    REAL_TIME_MONITORING: { ENABLED: true, UPDATE_FREQUENCY_SECONDS: 5 }
  },
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_FEATURES: ['screen_reader', 'adjustable_fonts', 'high_contrast', 'voice_commands'],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    ACCESSIBLE_VEHICLE_FEATURES: ['wheelchair_ramp', 'audio_assistance', 'braille_display']
  },
  TRAINING_CONSTANTS: {
    TRAINING_MODULES: [
      'mtxi_overview', 'driver_management', 'vehicle_compliance', 'ride_operations',
      'parking_integration', 'support_operations', 'analytics_reporting'
    ],
    CERTIFICATION_STATUSES: ['pending', 'completed', 'expired'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    TRAINING_FORMATS: ['video', 'document', 'interactive'],
    ANALYTICS_METRICS: ['training_completion_rate', 'certification_renewal']
  },
  ERROR_CODES: [
    'INVALID_RIDE', 'DRIVER_NOT_FOUND', 'VEHICLE_NOT_FOUND', 'PERMISSION_DENIED',
    'SUPPORT_TICKET_FAILED', 'NOTIFICATION_DELIVERY_FAILED', 'COMPLIANCE_VIOLATION',
    'ANALYTICS_GENERATION_FAILED', 'OFFLINE_MODE_UNAVAILABLE', 'PARKING_ASSIGNMENT_FAILED'
  ],
  SUCCESS_MESSAGES: [
    'ride_assigned', 'driver_verified', 'vehicle_approved', 'payment_processed',
    'parking_assigned', 'support_ticket_resolved', 'analytics_report_exported',
    'training_completed'
  ]
};