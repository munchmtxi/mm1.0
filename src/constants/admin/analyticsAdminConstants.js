'use strict';

module.exports = {
  ROLE: 'analytics_admin',
  DESCRIPTION: 'Manages platform analytics and reporting.',
  PERMISSIONS: {
    manageAnalytics: ['read', 'write', 'export'],
    manageUsers: ['read'],
    manageLogs: ['read']
  },
  SETTINGS: {
    MAX_LOGIN_SESSIONS: 5,
    SESSION_TIMEOUT_MINUTES: 60,
    TWO_FACTOR_AUTH: { ENABLED: true, METHODS: ['sms', 'email', 'authenticator_app'] },
    PROFILE_FIELDS: { REQUIRED: ['full_name', 'email', 'phone_number', 'role'], OPTIONAL: ['preferred_language'] }
  },
  ANALYTICS_OPERATIONS: {
    METRICS: [
      'user_activity', 'financial_performance', 'support_ticket_resolution',
      'cross_vertical_usage', 'user_retention', 'merchant_performance', 'parking_usage'
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    PERFORMANCE_THRESHOLDS: {
      SUPPORT_RESPONSE_TIME_HOURS: 12,
      FINANCIAL_REPORT_GENERATION_MINUTES: 3,
      API_RESPONSE_TIME_MS: 300,
      ERROR_RATE_PERCENTAGE: 0.5
    },
    DASHBOARD_TYPES: ['executive', 'operational', 'financial', 'support', 'parking'],
    EXPORT_LIMITS: { MAX_ROWS_CSV: 200000, MAX_PAGES_PDF: 100 },
    AI_ANALYTICS_ENABLED: true
  },
  NOTIFICATION_CONSTANTS: {
    TYPES: ['analytics_report', 'performance_alert', 'announcement'],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp', 'telegram'],
    MAX_PER_HOUR: 15,
    RETRY_ATTEMPTS: 5,
    RETRY_INTERVAL_SECONDS: 30
  },
  ERROR_CODES: ['PERMISSION_DENIED', 'ANALYTICS_GENERATION_FAILED'],
  SUCCESS_MESSAGES: ['analytics_report_exported']
};