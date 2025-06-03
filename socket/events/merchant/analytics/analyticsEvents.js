'use strict';

/**
 * analyticsEvents.js
 * Event constants for analytics in Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  EVENT_TYPES: {
    DATA_AGGREGATED: 'analytics:dataAggregated',
    PERFORMANCE_COMPARED: 'analytics:performanceCompared',
    REPORTS_GENERATED: 'analytics:reportsGenerated',
    RESOURCES_ALLOCATED: 'analytics:resourcesAllocated',
    BEHAVIOR_TRACKED: 'analytics:behaviorTracked',
    SPENDING_TRENDS_ANALYZED: 'analytics:spendingTrendsAnalyzed',
    RECOMMENDATIONS_PROVIDED: 'analytics:recommendationsProvided',
    POINTS_AWARDED: 'analytics:pointsAwarded',
    STAFF_METRICS_MONITORED: 'analytics:staffMetricsMonitored',
    STAFF_REPORT_GENERATED: 'analytics:staffReportGenerated',
    STAFF_FEEDBACK_PROVIDED: 'analytics:staffFeedbackProvided',
    STAFF_POINTS_AWARDED: 'analytics:staffPointsAwarded',
    DRIVER_METRICS_MONITORED: 'analytics:driverMetricsMonitored',
    DRIVER_REPORT_GENERATED: 'analytics:driverReportGenerated',
    DRIVER_FEEDBACK_PROVIDED: 'analytics:driverFeedbackProvided',
    DRIVER_POINTS_AWARDED: 'analytics:driverPointsAwarded',
  },

  NOTIFICATION_TYPES: {
    BRANCH_DATA_AGGREGATED: 'branch_data_aggregated',
    BRANCH_PERFORMANCE_COMPARED: 'branch_performance_compared',
    MULTI_BRANCH_REPORTS_GENERATED: 'multi_branch_reports_generated',
    RESOURCES_ALLOCATED: 'resources_allocated',
    CUSTOMER_BEHAVIOR_TRACKED: 'customer_behavior_tracked',
    SPENDING_TRENDS_ANALYZED: 'spending_trends_analyzed',
    RECOMMENDATIONS_PROVIDED: 'recommendations_provided',
    ANALYTICS_POINTS_AWARDED: 'analytics_points_awarded',
    STAFF_METRICS_MONITORED: 'staff_metrics_monitored',
    STAFF_PERFORMANCE_REPORT: 'staff_performance_report',
    STAFF_FEEDBACK_PROVIDED: 'staff_feedback_provided',
    STAFF_POINTS_AWARDED: 'staff_points_awarded',
    DRIVER_METRICS_MONITORED: 'driver_metrics_monitored',
    DRIVER_PERFORMANCE_REPORT: 'driver_performance_report',
    DRIVER_FEEDBACK_PROVIDED: 'driver_feedback_provided',
    DRIVER_POINTS_AWARDED: 'driver_points_awarded',
  },

  AUDIT_TYPES: {
    AGGREGATE_BRANCH_DATA: 'aggregate_branch_data',
    COMPARE_BRANCH_PERFORMANCE: 'compare_branch_performance',
    GENERATE_MULTI_BRANCH_REPORTS: 'generate_multi_branch_reports',
    ALLOCATE_RESOURCES: 'allocate_resources',
    TRACK_CUSTOMER_BEHAVIOR: 'track_customer_behavior',
    ANALYZE_SPENDING_TRENDS: 'analyze_spending_trends',
    PROVIDE_RECOMMENDATIONS: 'provide_recommendations',
    TRACK_ANALYTICS_GAMIFICATION: 'track_analytics_gamification',
    MONITOR_STAFF_METRICS: 'monitor_staff_metrics',
    GENERATE_STAFF_PERFORMANCE_REPORT: 'generate_staff_performance_report',
    PROVIDE_STAFF_FEEDBACK: 'provide_staff_feedback',
    TRACK_STAFF_GAMIFICATION: 'track_staff_gamification',
    MONITOR_DRIVER_METRICS: 'monitor_driver_metrics',
    GENERATE_DRIVER_REPORT: 'generate_driver_report',
    PROVIDE_DRIVER_FEEDBACK: 'provide_driver_feedback',
    TRACK_DRIVER_GAMIFICATION: 'track_driver_gamification',
  },

  SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
  },

  ERROR_CODES: {
    NO_ACTIVE_BRANCHES: 'NO_ACTIVE_BRANCHES',
    CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
    STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
    DRIVER_NOT_FOUND: 'DRIVER_NOT_FOUND',
  },
};