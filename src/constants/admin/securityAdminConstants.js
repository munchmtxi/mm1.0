/**
 * securityAdminConstants.js
 *
 * Defines constants for the Security Admin role, managing authentication and encryption.
 * Supports global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa,
 * India, Brazil) and aligns with driverConstants.js, staffConstants.js, customerConstants.js,
 * and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  ROLE: 'security_admin',

  // Permissions
  PERMISSIONS: {
    manageSecurity: ['read', 'write', 'configure'], // Authentication, encryption
    manageUsers: ['read'], // View security data
    manageLogs: ['read', 'write', 'archive'] // Security audit logs
  },

  // Admin Configuration
  SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en'],
    DEFAULT_TIMEZONE: 'UTC',
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    PROFILE_FIELDS: {
      REQUIRED: ['full_name', 'email', 'phone_number', 'role'],
      OPTIONAL: ['preferred_language']
    }
  },

  // Security Operations
  SECURITY_OPERATIONS: {
    ENCRYPTION_ALGORITHM: 'AES-256-GCM',
    TOKEN_EXPIRY_MINUTES: 60,
    REFRESH_TOKEN_EXPIRY_DAYS: 7,
    MFA_METHODS: ['sms', 'email', 'auth_app', 'biometric'],
    TOKENIZATION_PROVIDER: 'stripe',
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 30,
    AUDIT_LOG_RETENTION_DAYS: 180,
    SECURITY_INCIDENT_TYPES: ['unauthorized_access', 'data_breach', 'fraud_attempt', 'system_down'],
    PASSWORD_POLICY: {
      MIN_LENGTH: 12,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: true,
      MAX_AGE_DAYS: 90
    },
    TRANSACTION_VERIFICATION_METHODS: ['otp', 'biometric', 'pin']
  },

  // Error Codes
  ERROR_CODES: ['PERMISSION_DENIED', 'SECURITY_INCIDENT'],

  // Success Messages
  SUCCESS_MESSAGES: ['Security enhancement applied']
};