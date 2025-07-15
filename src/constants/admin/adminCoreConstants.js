'use strict';

module.exports = {
  ADMIN_ROLES: {
    super_admin: 'super_admin',
    regional_admin: 'regional_admin',
    financial_admin: 'financial_admin',
    compliance_admin: 'compliance_admin',
    support_admin: 'support_admin',
    analytics_admin: 'analytics_admin',
    security_admin: 'security_admin'
  },
  ADMIN_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'terminated'],
  ADMIN_SETTINGS: {
    MAX_ADMINS_PER_REGION: 50,
    MAX_LOGIN_SESSIONS_PER_ADMIN: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app', 'biometric'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role', 'region'], OPTIONAL: ['preferred_language', 'emergency_contact'] },
    PRIVACY_SETTINGS: { DATA_VISIBILITY: ['internal', 'anonymized'], LOG_ACCESS: ['audit_only', 'team'] }
  },
  ADMIN_PERMISSIONS: {
    super_admin: {
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
    regional_admin: {
      manageUsers: ['read', 'write', 'suspend'],
      manageFinancials: ['read'],
      manageCompliance: ['read', 'write'],
      manageSupport: ['read', 'write', 'payment'],
      manageAnalytics: ['read'],
      managePlatformSettings: ['read'],
      manageLogs: ['read']
    },
    financial_admin: {
      manageFinancials: ['read', 'write', 'approve'],
      manageUsers: ['read'],
      manageAnalytics: ['read', 'export'],
      manageCompliance: ['read', 'write'],
      manageLogs: ['read']
    },
    compliance_admin: {
      manageCompliance: ['read', 'write', 'audit'],
      manageUsers: ['read'],
      manageAnalytics: ['read'],
      manageLogs: ['read', 'write']
    },
    support_admin: {
      manageSupport: ['read', 'write', 'escalate'],
      manageUsers: ['read'],
      manageAnalytics: ['read'],
      manageLogs: ['read']
    },
    analytics_admin: {
      manageAnalytics: ['read', 'write', 'export'],
      manageUsers: ['read'],
      manageLogs: ['read']
    },
    security_admin: {
      manageSecurity: ['read', 'write', 'configure'],
      manageUsers: ['read'],
      manageLogs: ['read', 'write', 'archive']
    }
  },
  USER_MANAGEMENT: {
    USER_TYPES: ['customer', 'driver', 'merchant'],
    USER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'banned'],
    ONBOARDING_STEPS: ['profile_creation', 'document_verification', 'compliance_check'],
    VERIFICATION_METHODS: ['email', 'sms', 'document_upload', 'biometric'],
    SUSPENSION_REASONS: ['policy_violation', 'fraud', 'non_compliance', 'inactivity'],
    DOCUMENT_TYPES: ['drivers_license', 'business_license', 'health_permit', 'halal_certification'],
    MAX_USERS_PER_REGION: 5000,
    MAX_DOCUMENT_UPLOADS: 10
  },
  WALLET_CONSTANTS: {
    WALLET_TYPES: ['customer', 'driver', 'merchant', 'staff', 'admin'],
    PAYMENT_METHODS: ['credit_card', 'debit_card', 'digital_wallet', 'bank_transfer', 'mobile_money', 'crypto'],
    PAYMENT_STATUSES: ['pending', 'completed', 'failed', 'refunded', 'rejected', 'disputed'],
    TRANSACTION_TYPES: ['deposit', 'payment', 'refund', 'withdrawal', 'payout', 'fee'],
    WALLET_SETTINGS: {
      MIN_DEPOSIT_AMOUNT: 5,
      MAX_DEPOSIT_AMOUNT: 10000,
      MIN_WITHDRAWAL_AMOUNT: 5,
      MAX_WITHDRAWAL_AMOUNT: 15000,
      MIN_PAYOUT_AMOUNT: 5,
      MAX_PAYOUT_AMOUNT: 10000,
      TRANSACTION_LIMIT_PER_DAY: 200,
      MAX_WALLET_BALANCE: 100000
    },
    PAYOUT_SETTINGS: {
      SUPPORTED_PAYOUT_METHODS: ['bank_transfer', 'wallet_transfer', 'mobile_money', 'crypto'],
      MAX_PAYOUT_FREQUENCY_DAYS: 7,
      PAYOUT_PROCESSING_TIME_HOURS: 24,
      CRYPTO_WALLETS: ['BTC', 'ETH', 'USDT']
    }
  },
  PLATFORM_CONSTANTS: {
    PRICING_MODELS: ['fixed', 'dynamic', 'subscription', 'hybrid'],
    RATE_LIMITS: { API_CALLS_PER_MINUTE: 200, USER_ACTIONS_PER_HOUR: 1000, ADMIN_ACTIONS_PER_HOUR: 2000 },
    BACKUP_SETTINGS: { BACKUP_FREQUENCY_HOURS: 12, DATA_RETENTION_DAYS: 730, MAX_BACKUP_SIZE_MB: 20000 },
    SYSTEM_HEALTH: { MIN_UPTIME_PERCENTAGE: 99.95, MAX_DOWNTIME_MINUTES_PER_MONTH: 20, HEALTH_CHECK_INTERVAL_SECONDS: 30 }
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['user_activity', 'financial_performance', 'support_ticket_resolution', 'platform_health', 'cross_vertical_usage', 'parking_usage'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    AI_ANALYTICS_ENABLED: true
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['user_update', 'financial_update', 'compliance_alert', 'support_ticket', 'platform_announcement', 'security_alert', 'analytics_report'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 20,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: [
    'INVALID_ADMIN', 'ADMIN_NOT_FOUND', 'PERMISSION_DENIED', 'USER_SUSPENSION_FAILED',
    'WALLET_OPERATION_FAILED', 'PAYMENT_FAILED', 'CONFIGURATION_UPDATE_FAILED'
  ],
  SUCCESS_MESSAGES: [
    'admin_created', 'user_suspended', 'user_onboarded', 'financial_report_generated',
    'platform_config_updated'
  ]
};