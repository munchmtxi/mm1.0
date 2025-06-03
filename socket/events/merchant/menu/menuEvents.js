'use strict';

/**
 * menuEvents.js
 * Event constants for menu-related actions in Munch merchant service.
 * Last Updated: May 21, 2025
 */

module.exports = {
  EVENT_TYPES: {
    MENU_CREATED: 'menu:menuCreated',
    MENU_UPDATED: 'menu:menuUpdated',
    DYNAMIC_PRICING_APPLIED: 'menu:dynamicPricingApplied',
    POINTS_AWARDED: 'menu:pointsAwarded',
  },

  NOTIFICATION_TYPES: {
    MENU_CREATED: 'menu_created',
    MENU_UPDATED: 'menu_updated',
    DYNAMIC_PRICING_APPLIED: 'dynamic_pricing_applied',
    MENU_POINTS_AWARDED: 'menu_points_awarded',
  },

  AUDIT_TYPES: {
    CREATE_MENU: 'create_menu',
    UPDATE_MENU: 'update_menu',
    APPLY_DYNAMIC_PRICING: 'apply_dynamic_pricing',
    TRACK_MENU_GAMIFICATION: 'track_menu_gamification',
  },

  SETTINGS: {
    VALID_PROMOTION_TYPES: ['percentage', 'fixed_amount', 'buy_x_get_y', 'bundle', 'loyalty', 'flash_sale'],
    DEFAULT_LANGUAGE: 'en',
  },

  ERROR_CODES: {
    INVALID_PROMOTION_TYPE: 'INVALID_PROMOTION_TYPE',
  },
};