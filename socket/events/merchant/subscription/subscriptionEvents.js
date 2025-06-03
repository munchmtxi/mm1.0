// src/socket/events/merchant/subscription/subscriptionEvents.js
'use strict';

/**
 * Subscription Events Constants
 * Constants for merchant subscription management socket events.
 * Last Updated: May 22, 2025
 */

module.exports = {
  EVENT_TYPES: {
    PLAN_CREATED: 'subscription:planCreated',
    TIERS_TRACKED: 'subscription:tiersTracked',
    SUBSCRIPTION_MANAGED: 'subscription:managed',
    GAMIFICATION_TRACKED: 'subscription:gamification',
  },

  SETTINGS: {
    DEFAULT_LANGUAGE: 'en',
  }
};