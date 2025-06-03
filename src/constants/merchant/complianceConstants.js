'use strict';

/**
 * complianceConstants.js
 * Constants for regulatory and data protection compliance for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Regulatory compliance event types for socket emissions
  EVENT_TYPES: {
    CERTIFICATIONS_MANAGED: 'compliance:certificationsManaged',
    STAFF_VERIFIED: 'compliance:staffVerified',
    DRIVER_VERIFIED: 'compliance:driverVerified',
    COMPLIANCE_AUDITED: 'compliance:audited',
  },

  // Data protection event types
  DATA_PROTECTION_EVENT_TYPES: {
    DATA_ENCRYPTED: 'dataProtection:encrypted',
    GDPR_ENFORCED: 'dataProtection:gdprEnforced',
    ACCESS_MANAGED: 'dataProtection:accessManaged',
    SECURITY_POINTS_AWARDED: 'dataProtection:securityPointsAwarded',
  },

  // Notification types for compliance events
  NOTIFICATION_TYPES: {
    CERTIFICATION_UPDATED: 'certification_updated',
    STAFF_COMPLIANCE_ISSUE: 'staff_compliance_issue',
    DRIVER_COMPLIANCE_ISSUE: 'driver_compliance_issue',
    COMPLIANCE_ISSUE: 'compliance_issue',
    GDPR_COMPLIANCE_ISSUE: 'gdpr_compliance_issue',
    DATA_ACCESS_UPDATED: 'data_access_updated',
    SECURITY_POINTS_AWARDED: 'security_points_awarded',
  },

  // Audit log action types
  AUDIT_TYPES: {
    MANAGE_CERTIFICATIONS: 'manage_certifications',
    VERIFY_STAFF_COMPLIANCE: 'verify_staff_compliance',
    VERIFY_DRIVER_COMPLIANCE: 'verify_driver_compliance',
    AUDIT_COMPLIANCE: 'audit_compliance',
    ENCRYPT_DATA: 'encrypt_data',
    ENFORCE_GDPR: 'enforce_gdpr',
    MANAGE_DATA_ACCESS: 'manage_data_access',
    TRACK_SECURITY_GAMIFICATION: 'track_security_gamification',
  },

  // Compliance settings
  SETTINGS: {
    CERTIFICATION_EXPIRY_DAYS: 365,
    AUDIT_FREQUENCY_DAYS: 180,
    SUPPORTED_REGULATIONS: ['GDPR', 'CCPA'],
    DEFAULT_LANGUAGE: 'en',
  },

  // Error codes
  ERROR_CODES: {
    INVALID_CERTIFICATION_TYPE: 'INVALID_CERTIFICATION_TYPE',
    INVALID_ROLE: 'INVALID_ROLE',
    INVALID_PERMISSIONS: 'INVALID_PERMISSIONS',
  },
};