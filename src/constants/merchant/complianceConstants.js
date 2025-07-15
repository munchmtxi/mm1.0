'use strict';

/**
 * complianceConstants.js
 *
 * Defines constants for compliance across all merchant types (e.g., bakery, butcher, cafe, etc.),
 * covering regulatory requirements, certifications, audits, and data protection standards.
 * Supports 15 countries with localization handled by localizationConstants.js and aligns with
 * driverConstants.js, staffConstants.js, customerConstants.js, admin constants, and merchantConstants.js.
 *
 * Last Updated: June 24, 2025
 */

module.exports = {
  // Regulatory Requirements
  REGULATORY_REQUIREMENTS: {
    ALL_MERCHANTS: ['business_license', 'tax_registration', 'data_protection'],
    FOOD_MERCHANTS: ['food_safety', 'health_permit'],
    BAKERY_SPECIFIC: ['halal_certification', 'kosher_certification'],
    BUTCHER_SPECIFIC: ['halal_certification'],
    CAFE_SPECIFIC: ['halal_certification', 'kosher_certification'],
    CATERER_SPECIFIC: ['halal_certification', 'kosher_certification'],
    DARK_KITCHEN_SPECIFIC: ['halal_certification', 'kosher_certification'],
    GROCERY_SPECIFIC: ['halal_certification', 'kosher_certification'],
    PARKING_LOT_SPECIFIC: ['parking_permit', 'fire_safety'],
    RESTAURANT_SPECIFIC: ['halal_certification', 'kosher_certification', 'alcohol_license'],
  },

  // Certification Settings
  CERTIFICATION_SETTINGS: {
    CERTIFICATION_STATUSES: ['pending', 'approved', 'rejected', 'expired', 'suspended'],
    CERTIFICATION_EXPIRY_DAYS: 365,
    RENEWAL_NOTIFICATION_DAYS: [30, 15, 7, 1],
    AUTO_RENEWAL_ENABLED: true,
    AUTO_RENEWAL_THRESHOLD_DAYS: 30,
    DOCUMENT_UPLOAD_FORMATS: ['pdf', 'jpg', 'png'],
    MAX_DOCUMENT_SIZE_MB: 10,
  },

  // Audit Settings
  AUDIT_SETTINGS: {
    AUDIT_FREQUENCY_DAYS: 90,
    AUDIT_TYPES: [
      'order_processed', 'inventory_updated', 'payment_processed', 'booking_confirmed', 'event_confirmed',
      'custom_order_confirmed', 'substitution_processed', 'check_in_processed', 'compliance_review',
    ],
    AUDIT_LOG_RETENTION_DAYS: 730,
    AI_AUDIT_ANALYSIS: true,
    AUDIT_REPORT_FORMATS: ['pdf', 'csv', 'json'],
    NON_COMPLIANCE_PENALTIES: [
      { type: 'warning', severity: 'low', action: 'notification' },
      { type: 'fine', severity: 'medium', action: 'payment_deduction' },
      { type: 'suspension', severity: 'high', action: 'account_restriction' },
    ],
  },

  // Data Protection Standards
  DATA_PROTECTION_STANDARDS: {
    SUPPORTED_STANDARDS: ['GDPR', 'CCPA', 'LGPD', 'PIPA', 'POPIA'],
    CONSENT_METHODS: ['explicit', 'implicit', 'opt_in', 'opt_out'],
    DATA_RETENTION_DEFAULT_DAYS: 365,
    DATA_ANONYMIZATION_ENABLED: true,
    DATA_BREACH_NOTIFICATION_HOURS: 72,
  },

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'certification_expiring', 'certification_renewed', 'audit_scheduled', 'audit_completed',
      'compliance_violation', 'data_breach_alert',
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    PRIORITY_LEVELS: ['low', 'medium', 'high', 'urgent'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 30,
  },

  // Analytics
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'compliance_rate', 'certification_status', 'audit_frequency', 'data_breach_incidents',
      'non_compliance_penalties',
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['compliance_improvements', 'certification_renewals'],
  },

  // Error Codes
  ERROR_CODES: [
    'INVALID_CERTIFICATION', 'AUDIT_FAILED', 'COMPLIANCE_VIOLATION', 'DATA_BREACH', 'DOCUMENT_UPLOAD_FAILED',
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'certification_approved', 'audit_completed', 'compliance_review_passed', 'data_protection_updated',
  ],
};