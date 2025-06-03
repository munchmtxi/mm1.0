/**
 * complianceAdminConstants.js
 *
 * Defines constants for the Compliance Admin role, managing certifications and audits.
 * Supports global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa,
 * India, Brazil) and aligns with driverConstants.js, staffConstants.js, customerConstants.js,
 * and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  ROLE: 'compliance_admin',

  // Permissions
  PERMISSIONS: {
    manageCompliance: ['read', 'write', 'audit'], // Certifications, audits
    manageUsers: ['read'], // View compliance data
    manageAnalytics: ['read'], // Compliance analytics
    manageLogs: ['read', 'write'] // Compliance audit logs
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

  // Compliance Operations
  COMPLIANCE_OPERATIONS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'drivers_license', 'vehicle_insurance', 'halal_certification', 'tax_registration'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA'],
    AUDIT_FREQUENCY_DAYS: 180,
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_TYPES: ['financial', 'operational', 'compliance']
  },

  // Error Codes
  ERROR_CODES: ['PERMISSION_DENIED', 'COMPLIANCE_VIOLATION'],

  // Success Messages
  SUCCESS_MESSAGES: ['Compliance audit completed']
};