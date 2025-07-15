'use strict';

module.exports = {
  ROLE: 'compliance_admin',
  DESCRIPTION: 'Manages certifications, audits, and regulatory compliance.',
  PERMISSIONS: {
    manageCompliance: ['read', 'write', 'audit'],
    manageUsers: ['read'],
    manageAnalytics: ['read'],
    manageLogs: ['read', 'write']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language'] }
  },
  COMPLIANCE_OPERATIONS: {
    REGULATORY_REQUIREMENTS: ['food_safety', 'health_permit', 'business_license', 'drivers_license', 'vehicle_insurance', 'halal_certification', 'tax_registration'],
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired'],
    DATA_PROTECTION_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
    AUDIT_FREQUENCY_DAYS: 90,
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_TYPES: ['financial', 'operational', 'compliance'],
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7]
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['compliance_rate', 'audit_completion', 'certification_renewal'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['compliance_alert', 'audit_scheduled', 'certification_renewal', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: ['PERMISSION_DENIED', 'COMPLIANCE_VIOLATION', 'AUDIT_FAILED'],
  SUCCESS_MESSAGES: ['compliance_audit_completed', 'certification_approved']
};