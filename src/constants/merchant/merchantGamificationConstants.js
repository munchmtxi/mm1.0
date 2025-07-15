'use strict';

/**
 * merchantGamificationConstants.js
 *
 * Gamification constants for all merchant types across the MunchMtxi system, empowering clan-wide engagement through
 * meaningful actions, rewards, and achievements. Fully integrated with wallet, analytics, cross-vertical modules, and
 * localized across 15+ nations. Syncs with localizationConstants.js, customer/driver/staff gamification files,
 * and role-specific dashboards.
 *
 * Last Updated: July 9, 2025
 */

module.exports = {
  // Core Gamification Settings
  GAMIFICATION_SETTINGS: {
    ENABLED: true,
    MAX_DAILY_ACTIONS: 100,
    POINTS_EXPIRY_DAYS: 365,
    LEADERBOARD_TYPES: ['global', 'regional', 'merchant_type', 'branch_specific'],
    LEADERBOARD_UPDATE_FREQUENCY_HOURS: 24,
    REWARD_CATEGORIES: ['discounts', 'free_services', 'crypto_rewards', 'exclusive_access'],
    AI_PERSONALIZATION: true,
    SOCIAL_SHARING: ['leaderboard_rank', 'achievement_unlocked', 'reward_redeemed'],
  },

  // Core Actions
  GAMIFICATION_ACTIONS: {
    GENERAL: [],
    BAKERY_SPECIFIC: [],
    BUTCHER_SPECIFIC: [],
    CAFE_SPECIFIC: [],
    CATERER_SPECIFIC: [],
    DARK_KITCHEN_SPECIFIC: [],
    GROCERY_SPECIFIC: [],
    PARKING_LOT_SPECIFIC: [],
    RESTAURANT_SPECIFIC: [],

    // Expanded System Modules (Sections Defined, Content Pending)
    WALLET: [],
    SECURITY: [],
    PROFILE: [],
    MUNCH: [],
    MTABLES: [],
    MPARK: [],
    MEVENTS: [],
    MENU: [],
    DRIVERS: [],
    CROSS_VERTICAL: [],
    STAFF: []
  },

  // Achievements and Rewards
  ACHIEVEMENT_TYPES: [],

  // System Codes
  ERROR_CODES: [],
  SUCCESS_MESSAGES: []
};
