'use strict';

/**
 * financialAnalyticsEvents.js
 * Constants for financial analytics events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Financial analytics event types for notifications and socket events
  EVENT_TYPES: {
    TRANSACTIONS_TRACKED: 'analytics:transactionsTracked',
    REPORT_GENERATED: 'analytics:reportGenerated',
    TRENDS_ANALYZED: 'analytics:trendsAnalyzed',
    GOALS_RECOMMENDED: 'analytics:goalsRecommended',
  },

  // Audit log action types for financial analytics operations
  AUDIT_TYPES: {
    TRACK_FINANCIAL_TRANSACTIONS: 'track_financial_transactions',
    GENERATE_FINANCIAL_REPORT: 'generate_financial_report',
    ANALYZE_FINANCIAL_TRENDS: 'analyze_financial_trends',
    RECOMMEND_FINANCIAL_GOALS: 'recommend_financial_goals',
  },

  // Notification types for financial analytics events
  NOTIFICATION_TYPES: {
    FINANCIAL_REPORT_GENERATED: 'financial_report_generated',
    FINANCIAL_GOALS_RECOMMENDED: 'financial_goals_recommended',
  },

  // Settings for financial analytics operations
  ANALYTICS_SETTINGS: {
    SUPPORTED_PERIODS: ['daily', 'weekly', 'monthly'],
    DEFAULT_CURRENCY: 'MWK',
    TREND_ANALYSIS_PERIOD_MONTHS: 6,
    NOTIFICATION_RATE_LIMIT: 5, // Max notifications per hour
    DEFAULT_LANGUAGE: 'en',
  },

  // Error codes for financial analytics operations
  ERROR_CODES: {
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    INVALID_PERIOD: 'INVALID_PERIOD',
  },
};