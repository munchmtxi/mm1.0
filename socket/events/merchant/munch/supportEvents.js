'use strict';

/**
 * supportEvents.js
 * Constants for support events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Support event types for notifications and socket events
  EVENT_TYPES: {
    TICKET_CREATED: 'support:ticketCreated',
    DISPUTE_RESOLVED: 'support:disputeResolved',
    POLICIES_SHARED: 'support:policiesShared',
    POINTS_AWARDED: 'gamification:pointsAwarded',
  },

  // Audit log action types for support operations
  AUDIT_TYPES: {
    HANDLE_ORDER_INQUIRY: 'handle_order_inquiry',
    RESOLVE_ORDER_DISPUTE: 'resolve_order_dispute',
    SHARE_ORDER_POLICIES: 'share_order_policies',
    TRACK_SUPPORT_GAMIFICATION: 'track_support_gamification',
  },

  // Notification types for support events
  NOTIFICATION_TYPES: {
    INQUIRY_SUBMITTED: 'inquiry_submitted',
    TICKET_ASSIGNED: 'ticket_assigned',
    DISPUTE_RESOLVED: 'dispute_resolved',
    ORDER_POLICIES: 'order_policies',
    SUPPORT_POINTS_EARNED: 'support_points_earned',
  },

  // Settings for support operations
  SUPPORT_SETTINGS: {
    SUPPORTED_ISSUE_TYPES: [
      'PAYMENT_ISSUE',
      'SERVICE_QUALITY',
      'CANCELLATION',
      'DELIVERY_ISSUE',
      'ORDER_ISSUE',
      'OTHER',
    ],
    SUPPORTED_RESOLUTION_ACTIONS: ['refund', 'replacement', 'discount', 'no_action'],
    SUPPORTED_STATUSES: ['open', 'in_progress', 'escalated', 'resolved', 'closed'],
    NOTIFICATION_RATE_LIMIT: 5, // Max notifications per hour per customer
    DEFAULT_LANGUAGE: 'en',
  },

  // Error codes for support operations
  ERROR_CODES: {
    ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
    TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
    INVALID_ISSUE_TYPE: 'INVALID_ISSUE_TYPE',
    INVALID_RESOLUTION_ACTION: 'INVALID_RESOLUTION_ACTION',
    CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
    NO_RESOLVED_TICKETS: 'NO_RESOLVED_TICKETS',
  },
};