'use strict';

module.exports = {
  ROLE: 'security_admin',
  DESCRIPTION: 'Manages platform authentication, encryption, and security operations.',
  PERMISSIONS: {
    manageSecurity: ['read', 'write', 'configure'],
    manageUsers: ['read'],
    manageLogs: ['read', 'write', 'archive']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app', 'biometric'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language'] }
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
    SECURITY_INCIDENT_TYPES: ['unauthorized_access', 'data_breach', 'fraud_attempt', 'system_down'],
    PASSWORD_POLICY: {
      MIN_LENGTH: 14,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
      MAX_AGE_DAYS: 60
    },
    TRANSACTION_VERIFICATION_METHODS: ['otp', 'biometric', 'pin']
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['security_incident_rate', 'mfa_adoption', 'login_failure_rate', 'fraud_detection_rate'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['security_alert', 'mfa_update', 'incident_report', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: ['PERMISSION_DENIED', 'SECURITY_INCIDENT', 'AUTHENTICATION_FAILED'],
  SUCCESS_MESSAGES: ['security_enhancement_applied', 'incident_mitigated']
};