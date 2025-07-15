'use strict';

module.exports = {
  ROLE: 'regional_admin',
  DESCRIPTION: 'Provides region-specific oversight for users, compliance, and analytics.',
  PERMISSIONS: {
    manageUsers: ['read', 'write', 'suspend'],
    manageFinancials: ['read'],
    manageCompliance: ['read', 'write'],
    manageSupport: ['read', 'write', 'payment'],
    manageAnalytics: ['read'],
    managePlatformSettings: ['read'],
    manageLogs: ['read']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role', 'region'], OPTIONAL: ['preferred_language'] }
  },
  USER_MANAGEMENT: {
    USER_TYPES: ['customer', 'driver', 'merchant'],
    USER_STATUSES: ['active', 'inactive', 'pending_verification', 'suspended', 'banned'],
    ONBOARDING_STEPS: ['profile_creation', 'document_verification', 'compliance_check'],
    VERIFICATION_METHODS: ['email', 'sms', 'document_upload', 'biometric'],
    SUSPENSION_REASONS: ['policy_violation', 'non_compliance', 'inactivity'],
    DOCUMENT_TYPES: ['drivers_license', 'business_license', 'health_permit', 'halal_certification']
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['user_growth', 'verification_rate', 'suspension_rate', 'merchant_performance'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['user_update', 'compliance_alert', 'suspension_alert', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: ['INVALID_ADMIN', 'PERMISSION_DENIED', 'USER_SUSPENSION_FAILED'],
  SUCCESS_MESSAGES: ['admin_created', 'user_suspended', 'user_onboarded']
};