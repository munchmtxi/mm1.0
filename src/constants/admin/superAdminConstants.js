'use strict';

module.exports = {
  ROLE: 'super_admin',
  DESCRIPTION: 'Full platform access to manage users, financials, compliance, support, analytics, security, and platform settings.',
  PERMISSIONS: {
    manageUsers: ['read', 'write', 'delete', 'suspend'],
    manageFinancials: ['read', 'write', 'approve'],
    manageCompliance: ['read', 'write', 'audit'],
    manageSupport: ['read', 'write', 'escalate'],
    manageAnalytics: ['read', 'write', 'export'],
    managePlatformSettings: ['read', 'write', 'deploy'],
    manageSecurity: ['read', 'write', 'configure'],
    manageBackups: ['read', 'write', 'restore'],
    manageLogs: ['read', 'write', 'archive']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 10,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app', 'biometric'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language', 'emergency_contact'] },
    PRIVACY_SETTINGS: { DATA_VISIBILITY: ['internal', 'anonymized'], LOG_ACCESS: ['audit_only', 'team'] }
  },
  USER_MANAGEMENT: {
    USER_TYPES: ['customer', 'driver', 'merchant', 'admin'],
    USER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'banned'],
    ONBOARDING_STEPS: ['profile_creation', 'document_verification', 'compliance_check'],
    VERIFICATION_METHODS: ['email', 'sms', 'document_upload', 'biometric'],
    SUSPENSION_REASONS: ['policy_violation', 'fraud', 'non_compliance', 'inactivity'],
    DOCUMENT_TYPES: ['drivers_license', 'business_license', 'health_permit', 'halal_certification', 'tax_registration'],
    MAX_USERS_PER_REGION: 10000,
    MAX_DOCUMENT_UPLOADS: 10
  },
  FINANCIAL_OPERATIONS: {
    WALLET_TYPES: ['customer', 'driver', 'merchant', 'staff', 'admin'],
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money', 'crypto'],
    TRANSACTION_TYPES: ['deposit', 'payment', 'refund', 'withdrawal', 'payout', 'fee'],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
      MAX_DEPOSIT_AMOUNT: 15000,
      MIN_WITHDRAWAL_AMOUNT: 5,
      MAX_WITHDRAWAL_AMOUNT: 20000,
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 15000,
      TRANSACTION_LIMIT_PER_DAY: 500,
      MAX_WALLET_BALANCE: 150000
    },
    PAYOUT_SETTINGS: {
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT', 'BNB']
    },
    FRAUD_DETECTION: {
      MAX_SUSPICIOUS_TRANSACTIONS_PER_DAY: 10,
      TRANSACTION_VELOCITY_LIMIT: 20,
      IP_BLOCK_DURATION_HOURS: 12
    }
  },
  COMPLIANCE_OPERATIONS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'drivers_license', 'vehicle_insurance', 'halal_certification', 'tax_registration'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
    AUDIT_FREQUENCY_DAYS: 90,
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_TYPES: ['financial', 'operational', 'security', 'compliance'],
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  SUPPORT_OPERATIONS: {
    ISSUE_TYPES: ['booking', 'order', 'ride', 'delivery', 'parking', 'payment', 'wallet', 'platform', 'other'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology', 'user_suspension', 'warning'],
    SUPPORT_RESPONSE_TIME_HOURS: { STANDARD: 12, PRIORITY: 4, URGENT: 1 },
    TICKET_PRIORITIES: ['low', 'medium', 'high', 'critical'],
    ESCALATION_LEVELS: ['tier_1', 'tier_2', 'tier_3']
  },
  SECURITY_OPERATIONS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    POST_QUANTUM_ALGORITHM: 'Kyber-512',
    TOKEN_EXPIRY_MINUTES: 30,
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    MFA_METHODS: ['sms', 'email', 'authenticator_app', 'biometric'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    AUDIT_LOG_RETENTION_DAYS: 365,
    SECURITY_INCIDENT_TYPES: ['unauthorized_access', 'data_breach', 'fraud_attempt', 'system_down']
  },
  ANALYTICS_OPERATIONS: {
    METRICS: [
      'user_activity', 'financial_performance', 'support_ticket_resolution', 'platform_health',
      'cross_vertical_usage', 'parking_usage', 'merchant_performance', 'driver_performance'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      SUPPORT_RESPONSE_TIME_HOURS: 12,
      FINANCIAL_REPORT_GENERATION_MINUTES: 3,
      API_RESPONSE_TIME_MS: 300,
      ERROR_RATE_PERCENTAGE: 0.5
    },
    DASHBOARD_TYPES: ['executive', 'operational', 'financial', 'support', 'parking', 'compliance'],
    EXPORT_LIMITS: { MAX_ROWS_CSV: 200000, MAX_PAGES_PDF: 100 },
    AI_ANALYTICS_ENABLED: true
  },
  PLATFORM_OPERATIONS: {
    PRICING_MODELS: ['fixed', 'dynamic', 'subscription', 'hybrid'],
    RATE_LIMITS: { API_CALLS_PER_MINUTE: 500, USER_ACTIONS_PER_HOUR: 2000, ADMIN_ACTIONS_PER_HOUR: 5000 },
    BACKUP_SETTINGS: { BACKUP_FREQUENCY_HOURS: 12, DATA_RETENTION_DAYS: 730, MAX_BACKUP_SIZE_MB: 20000 },
    SYSTEM_HEALTH: { MIN_UPTIME_PERCENTAGE: 99.95, MAX_DOWNTIME_MINUTES_PER_MONTH: 20, HEALTH_CHECK_INTERVAL_SECONDS: 30 },
    FEATURE_FLAGS: ['new_ui', 'advanced_analytics', 'ai_assignment', 'beta_features'],
    DEPLOYMENT_SETTINGS: {
      ROLLBACK_WINDOW_HOURS: 24,
      MAX_CONCURRENT_DEPLOYS: 5,
      DEPLOYMENT_NOTIFICATION_METHODS: ['email', 'sms', 'whatsapp', 'telegram']
    }
  },
  SERVICE_OPERATIONS: {
    MTABLES: {
      BOOKING_STATUSES: ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'],
      TABLE_STATUSES: ['available', 'occupied', 'reserved', 'maintenance'],
      CHECK_IN_METHODS: ['qr_code', 'manual', 'auto', 'biometric']
    },
    MTXI: {
      RIDE_STATUSES: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
      RIDE_TYPES: ['standard', 'shared', 'premium'],
      DRIVER_ASSIGNMENT: { MAX_ASSIGNMENT_RADIUS_KM: 15, MAX_ASSIGNMENT_ATTEMPTS: 5, AI_ASSIGNMENT_ENABLED: true }
    },
    MPARK: {
      PARKING_STATUSES: ['available', 'occupied', 'reserved', 'disabled', 'maintenance'],
      PARKING_TYPES: ['public', 'private', 'vip', 'disabled'],
      SLOT_ASSIGNMENT: { MAX_ASSIGNMENT_RADIUS_KM: 5, AI_ASSIGNMENT_ENABLED: true },
      PRICING_SETTINGS: { MIN_HOURLY_RATE: 1, MAX_HOURLY_RATE: 50, DYNAMIC_PRICING_ENABLED: true }
    },
    MUNCH: {
      ORDER_STATUSES: ['pending', 'preparing', 'ready', 'in_delivery', 'delivered', 'cancelled'],
      ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
      DELIVERY_STATUSES: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled']
    },
    MEVENTS: {
      EVENT_STATUSES: ['draft', 'published', 'in_progress', 'completed', 'cancelled'],
      EVENT_TYPES: ['private', 'public', 'corporate']
    }
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: [
      'user_update', 'financial_update', 'compliance_alert', 'support_ticket', 'platform_announcement',
      'security_alert', 'analytics_report', 'backup_status', 'system_health'
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
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
    TRAINING_MODULES: [
      'platform_overview', 'user_management', 'financial_operations', 'compliance_audits',
      'support_operations', 'security_protocols', 'analytics_reporting', 'mpark_management', 'mtxi_management'
    ],
    CERTIFICATION_STATUSES: ['pending', 'completed', 'expired'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    TRAINING_FORMATS: ['video', 'document', 'interactive'],
    ANALYTICS_METRICS: ['training_completion_rate', 'certification_renewal']
  },
  ERROR_CODES: [
    'INVALID_ADMIN', 'ADMIN_NOT_FOUND', 'PERMISSION_DENIED', 'USER_SUSPENSION_FAILED',
    'WALLET_OPERATION_FAILED', 'PAYMENT_FAILED', 'CONFIGURATION_UPDATE_FAILED',
    'BACKUP_RESTORE_FAILED', 'SECURITY_INCIDENT', 'TRAINING_MODULE_NOT_FOUND'
  ],
  SUCCESS_MESSAGES: [
    'admin_created', 'user_suspended', 'user_onboarded', 'financial_report_generated',
    'platform_config_updated', 'backup_completed', 'security_enhancement_applied', 'training_completed'
  ]
};