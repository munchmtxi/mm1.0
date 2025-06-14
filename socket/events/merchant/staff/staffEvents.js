'use strict';

/**
 * staffEvents.js
 * Event constants for staff-related actions in Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  EVENT_TYPES: {
    ROLE_ASSIGNED: 'staff:roleAssigned',
    PERMISSIONS_UPDATED: 'staff:permissionsUpdated',
    COMPLIANCE_VERIFIED: 'staff:complianceVerified',
    GAMIFICATION_POINTS_AWARDED: 'staff:gamificationPointsAwarded',
    SCHEDULE_CREATED: 'staff:scheduleCreated',
    TIME_TRACKED: 'staff:timeTracked',
    SCHEDULE_NOTIFIED: 'staff:scheduleNotified',
    SCHEDULE_ADJUSTED: 'staff:scheduleAdjusted',
    TASK_ALLOCATED: 'staff:taskAllocated',
    TASK_PROGRESS: 'staff:taskProgress',
    TASK_DELAY_NOTIFIED: 'staff:taskDelayNotified',
    TASK_GAMIFICATION: 'staff:taskGamification',
    METRIC_MONITORED: 'staff:metricMonitored',
    PERFORMANCE_REPORT: 'staff:performanceReport',
    TRAINING_DISTRIBUTED: 'staff:trainingDistributed',
    PERFORMANCE_GAMIFICATION: 'staff:performanceGamification',
    MESSAGE_SENT: 'staff:messageSent',
    SHIFT_ANNOUNCED: 'staff:shiftAnnounced',
    CHANNEL_MANAGED: 'staff:channelManaged',
    COMMUNICATION_TRACKED: 'staff:communicationTracked',
  },

  NOTIFICATION_TYPES: {
    ROLE_ASSIGNED: 'role_assigned',
    PERMISSIONS_UPDATED: 'permissions_updated',
    COMPLIANCE_VERIFIED: 'compliance_verified',
    GAMIFICATION_POINTS_AWARDED: 'gamification_points_awarded',
    SCHEDULE_CREATED: 'schedule_created',
    TIME_TRACKED: 'time_tracked',
    SCHEDULE_NOTIFIED: 'schedule_notified',
    SCHEDULE_ADJUSTED: 'schedule_adjusted',
    TASK_ALLOCATED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
    TASK_UPDATED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
    TASK_DELAYED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
    TASK_GAMIFICATION: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
    METRIC_MONITORED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    PERFORMANCE_REPORT: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
    TRAINING_DISTRIBUTED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TRAINING_REMINDER,
    PERFORMANCE_GAMIFICATION: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
    MESSAGE_SENT: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
    SHIFT_ANNOUNCED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
    CHANNEL_MANAGED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
    COMMUNICATION_TRACKED: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PROFILE_UPDATED,
  },

  AUDIT_TYPES: {
    ROLE_ASSIGNMENT: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    PERMISSIONS_UPDATE: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    COMPLIANCE_VERIFICATION: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
    GAMIFICATION_TRACKING: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    SCHEDULE_MANAGEMENT: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    TASK_MANAGEMENT: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    PERFORMANCE_MANAGEMENT: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
    COMMUNICATION_MANAGEMENT: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
  },

  SETTINGS: {
    DEFAULT_LANGUAGE: staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
  },

  ERROR_CODES: {
    STAFF_NOT_FOUND: staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
    INVALID_ROLE: staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
    INVALID_PERMISSIONS: staffSystemConstants.STAFF_ERROR_CODES.PERMISSION_DENIED,
    INVALID_SHIFT: staffSystemConstants.STAFF_ERROR_CODES.INVALID_SHIFT,
    INVALID_TASK: staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED,
  },
};