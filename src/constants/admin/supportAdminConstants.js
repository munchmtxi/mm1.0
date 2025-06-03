/**
 * supportAdminConstants.js
 *
 * Defines constants for the Support Admin role, managing customer and user support tickets
 * and disputes. Supports global operations (Malawi, Tanzania, Kenya, Mozambique, Nigeria,
 * South Africa, India, Brazil) and aligns with driverConstants.js, staffConstants.js,
 * customerConstants.js, and merchantConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  ROLE: 'support_admin',

  // Permissions
  PERMISSIONS: {
    manageSupport: ['read', 'write', 'escalate'], // Tickets, disputes
    manageUsers: ['read'], // View user data for support
    manageAnalytics: ['read'], // Support analytics
    manageLogs: ['read'] // Support-related logs
  },

  // Admin Configuration
  SETTINGS: {
    DEFAULT_CURRENCY: 'USD',
    SUPPORTED_CURRENCIES: ['USD', 'MWK', 'TZS', 'KES', 'MZN', 'NGN', 'ZAR', 'INR', 'BRL'],
    DEFAULT_LANGUAGE: 'en',
    SUPPORTED_LANGUAGES: ['en', 'sw', 'pt', 'hi', 'yo', 'zu'],
    DEFAULT_TIMEZONE: 'UTC',
    MAX_LOGIN_SESSIONS: 3,
    SESSION_TIMEOUT_MINUTES: 30,
    PROFILE_FIELDS: {
      REQUIRED: ['full_name', 'email', 'phone_number', 'role'],
      OPTIONAL: ['preferred_language']
    }
  },

  // Support Operations
  SUPPORT_OPERATIONS: {
    ISSUE_TYPES: ['booking', 'order', 'ride', 'delivery', 'payment', 'wallet', 'platform', 'other'],
    DISPUTE_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    RESOLUTION_TYPES: ['refund', 'compensation', 'replacement', 'apology', 'warning'],
    SUPPORT_RESPONSE_TIME_HOURS: {
      STANDARD: 24,
      PRIORITY: 6,
      URGENT: 1
    },
    TICKET_PRIORITIES: ['low', 'medium', 'high', 'critical'],
    ESCALATION_LEVELS: ['tier_1', 'tier_2', 'tier_3']
  },

  // Error Codes
  ERROR_CODES: ['PERMISSION_DENIED', 'SUPPORT_TICKET_FAILED'],

  // Success Messages
  SUCCESS_MESSAGES: ['Support ticket resolved']
};