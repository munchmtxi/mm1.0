'use strict';

/**
 * notificationEvents.js
 * Event constants for notification-related actions in Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  EVENT_TYPES: {
    CUSTOMER_ALERT: 'notifications:customerAlert',
    STAFF_NOTIFICATION: 'notifications:staffNotification',
    DRIVER_NOTIFICATION: 'notifications:driverNotification',
    POINTS_AWARDED: 'notifications:pointsAwarded',
  },

  NOTIFICATION_TYPES: {
    ORDER_UPDATE: 'order_update',
    BOOKING_UPDATE: 'booking_update',
    TASK_ASSIGNMENT: 'task_assignment',
    SCHEDULE_UPDATE: 'schedule_update',
    DELIVERY_ASSIGNMENT: 'delivery_assignment',
    DELIVERY_UPDATE: 'delivery_update',
    NOTIFICATION_POINTS_AWARDED: 'notification_points_awarded',
  },

  AUDIT_TYPES: {
    SEND_CUSTOMER_ALERT: 'send_customer_alert',
    SEND_STAFF_NOTIFICATION: 'send_staff_notification',
    SEND_DRIVER_NOTIFICATION: 'send_driver_notification',
    TRACK_NOTIFICATION_GAMIFICATION: 'track_notification_gamification',
  },

  SETTINGS: {
    DEFAULT_DELIVERY_METHOD: 'push',
    DEFAULT_LANGUAGE: 'en',
  },

  ERROR_CODES: {
    INVALID_MESSAGE_TYPE: 'INVALID_MESSAGE_TYPE',
  },
};