'use strict';

/**
 * feedbackEvents.js
 * Event constants for feedback-related actions in Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  EVENT_TYPES: {
    REVIEW_COLLECTED: 'feedback:reviewCollected',
    INTERACTION_MANAGED: 'feedback:interactionManaged',
    FEEDBACK_RESPONDED: 'feedback:feedbackResponded',
    POINTS_AWARDED: 'feedback:pointsAwarded',
  },

  NOTIFICATION_TYPES: {
    REVIEW_RECEIVED: 'review_received',
    REVIEW_INTERACTION: 'review_interaction',
    FEEDBACK_RESPONSE: 'feedback_response',
    FEEDBACK_POINTS_AWARDED: 'feedback_points_awarded',
  },

  AUDIT_TYPES: {
    COLLECT_REVIEWS: 'collect_reviews',
    MANAGE_COMMUNITY_INTERACTIONS: 'manage_community_interactions',
    RESPOND_TO_FEEDBACK: 'respond_to_feedback',
    TRACK_FEEDBACK_GAMIFICATION: 'track_feedback_gamification',
  },

  SETTINGS: {
    VALID_RATING_RANGE: { MIN: 1, MAX: 5 },
    VALID_SERVICE_TYPES: ['order', 'in_dining_order', 'booking', 'ride'],
    DEFAULT_LANGUAGE: 'en',
  },

  ERROR_CODES: {
    INVALID_SERVICE_TYPE: 'INVALID_SERVICE_TYPE',
    INVALID_RATING: 'INVALID_RATING',
    INVALID_ACTION_TYPE: 'INVALID_ACTION_TYPE',
  },
};