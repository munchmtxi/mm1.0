/**
 * baristaConstants.js
 *
 * Defines constants for the Barista staff role, preparing coffee and beverage orders for cafe
 * merchants. Supports global operations with inclusivity and aligns with merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'barista',
  NAME: 'Barista',
  DESCRIPTION: 'Prepares coffee and beverage orders.',
  SUPPORTED_MERCHANT_TYPES: ['cafe'],

  RESPONSIBILITIES: [
    'Prepare coffee orders (munch)',
    'Log gamification points for prep speed'
  ],

  PERMISSIONS: ['prepare_coffee', 'view_wallet', 'request_withdrawal', 'log_gamification'],

  TASK_TYPES: {
    munch: ['prepare_coffee']
  },

  REQUIRED_CERTIFICATIONS: ['food_safety'],

  TRAINING_CATEGORIES: ['food_safety', 'financial'],

  GAMIFICATION_ACTIONS: [
    { action: 'timely_prep', points: 15, walletCredit: 0.50 },
    { action: 'coffee_preparation', points: 10, walletCredit: 0.30 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['prep_time', 'task_completion_rate'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};