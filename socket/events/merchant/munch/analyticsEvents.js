'use strict';

/**
 * analyticsEvents.js
 * Constants for analytics events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Supported report periods for analytics
  REPORT_PERIODS: ['daily', 'weekly', 'monthly', 'yearly'],

  // Analytics event types for notifications and socket events
  EVENT_TYPES: {
    ORDER_TRENDS: 'analytics:orderTrends',
    DELIVERY_PERFORMANCE: 'analytics:deliveryPerformance',
    CUSTOMER_INSIGHTS: 'analytics:customerInsights',
    GAMIFICATION: 'analytics:gamification',
    DELIVERY_LOCATIONS: 'analytics:deliveryLocations',
  },

  // Audit log action types for analytics
  AUDIT_TYPES: {
    TRACK_ORDER_TRENDS: 'track_order_trends',
    MONITOR_DELIVERY_PERFORMANCE: 'monitor_delivery_performance',
    AGGREGATE_CUSTOMER_INSIGHTS: 'aggregate_customer_insights',
    TRACK_GAMIFICATION: 'track_gamification',
    ANALYZE_DELIVERY_LOCATIONS: 'analyze_delivery_locations',
  },

  // Notification types for analytics events
  NOTIFICATION_TYPES: {
    MERCHANT_ANALYTICS: 'merchant_analytics',
  },

  // Settings for analytics thresholds and behavior
  ANALYTICS_SETTINGS: {
    HIGH_ENGAGEMENT_THRESHOLD: 100, // Unique customers for notification
    ON_TIME_RATE_THRESHOLD: 0.9, // 90% for driver gamification points
    DEFAULT_CURRENCY: 'MWK',
    MAX_ANALYTICS_PER_HOUR: 50, // Rate limit for analytics requests
  },

  // Error codes for analytics operations
  ERROR_CODES: {
    INVALID_PERIOD: 'INVALID_PERIOD',
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  },
};