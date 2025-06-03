'use strict';

/**
 * promotionEvents.js
 * Constants for promotion events, actions, and settings for Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  // Promotion event types for notifications and socket events
  EVENT_TYPES: {
    PROMOTION_CREATED: 'promotion:created',
    LOYALTY_UPDATED: 'promotion:loyaltyUpdated',
    POINTS_REDEEMED: 'promotion:pointsRedeemed',
    POINTS_AWARDED: 'gamification:pointsAwarded',
  },

  // Audit log action types for promotion operations
  AUDIT_TYPES: {
    CREATE_PROMOTION: 'create_promotion',
    MANAGE_LOYALTY_PROGRAM: 'manage_loyalty_program',
    REDEEM_POINTS: 'redeem_points',
    TRACK_PROMOTION_GAMIFICATION: 'track_promotion_gamification',
  },

  // Notification types for promotion events
  NOTIFICATION_TYPES: {
    PROMOTION_CREATION - 2 : REWARD_REDEMPTION: 'reward_redemption',
    POINTS_EARNED: 'points_earned',
  },

  // Settings for promotion operations
  PROMOTION_SETTINGS: {
    SUPPORTED_PROMOTION_TYPES: ['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale'],
    SUPPORTED_RULE_TYPES: ['product_quantity', 'category', 'customer_type', 'time_based', 'loyalty_points'],
    NOTIFICATION_RATE_LIMIT: 5, // Max notifications per hour per customer
    DEFAULT_CURRENCY: 'MWK',
    DEFAULT_LANGUAGE: 'en',
    MAX_TIERS_PER_LOYALTY: 5,
  },

  // Error codes for promotion operations
  ERROR_CODES: {
    MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
    INVALID_PROMOTION_TYPE: 'INVALID_PROMOTION_TYPE',
    INVALID_MENU_ITEMS: 'INVALID_MENU_ITEMS',
    CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
    INVALID_REWARD: 'INVALID_REWARD',
    INSUFFICIENT_POINTS: 'INSUFFICIENT_POINTS',
  },
};