'use strict';

module.exports = {
  ROLE: 'support_admin',
  DESCRIPTION: 'Manages customer, merchant, and driver support tickets and disputes.',
  PERMISSIONS: {
    manageSupport: ['read', 'write', 'escalate'],
    manageUsers: ['read'],
    manageAnalytics: ['read'],
    manageLogs: ['read']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language'] }
  },
  SUPPORT_OPERATIONS: {
    ISSUE_TYPES: ['booking', 'order', 'ride', 'delivery', 'parking', 'payment', 'wallet', 'platform', 'other'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology', 'warning'],
    SUPPORT_RESPONSE_TIME_HOURS: { STANDARD: 12, PRIORITY: 4, URGENT: 1 },
    TICKET_PRIORITIES: ['low', 'medium', 'high', 'critical'],
    ESCALATION_LEVELS: ['tier_1', 'tier_2', 'tier_3']
  },
  ANALYTICS_CONSTANTS: {
    METRICS: ['ticket_resolution_time', 'escalation_rate', 'customer_satisfaction', 'merchant_satisfaction'],
    REPORT_FORMATS: ['csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['ticket_assignment', 'dispute_update', 'escalation_alert', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: ['PERMISSION_DENIED', 'SUPPORT_TICKET_FAILED', 'ESCALATION_FAILED'],
  SUCCESS_MESSAGES: ['ticket_resolved', 'dispute_escalated']
};