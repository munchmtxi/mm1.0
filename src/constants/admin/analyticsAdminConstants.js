/**
 * analyticsAdminConstants.js
 *
 * Defines constants for the Analytics Admin role, managing platform analytics and reporting.
 * Supports global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa,
 * India, Brazil) and aligns with driverConstants.js, staffConstants.js, customerConstants.js,
 * and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  ROLE: 'analytics_admin',

  // Permissions
  PERMISSIONS: {
    manageAnalytics: ['read', 'write', 'export'], // Platform analytics
    manageUsers: ['read'], // View user activity data
    manageLogs: ['read'] // Analytics-related logs
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

  // Analytics Operations
  ANALYTICS_OPERATIONS: {
    METRICS: ['user_activity', 'financial_performance', 'gamification_engagement', 'support_ticket_resolution', 'cross_vertical_usage', 'user_retention'],
    REPORT_FORMATS: ['pdf', 'csv', 'json'],
    DATA_RETENTION_DAYS: 365,
    PERFORMANCE_THRESHOLDS: {
      SUPPORT_RESPONSE_TIME_HOURS: 24,
      FINANCIAL_REPORT_GENERATION_MINUTES: 5,
      API_RESPONSE_TIME_MS: 500,
      ERROR_RATE_PERCENTAGE: 1
    },
    DASHBOARD_TYPES: ['executive', 'operational', 'financial', 'support'],
    EXPORT_LIMITS: {
      MAX_ROWS_CSV: 100000,
      MAX_PAGES_PDF: 50
    }
  },

  // Error Codes
  ERROR_CODES: ['PERMISSION_DENIED', 'ANALYTICS_GENERATION_FAILED'],

  // Success Messages
  SUCCESS_MESSAGES: ['Analytics report exported']
};