/**
 * kitchenConstants.js
 *
 * Defines constants for the Kitchen staff role, preparing food for dine-in, takeaway, and
 * delivery for restaurant, dark_kitchen, caterer, cafe, and bakery merchants. Supports global
 * operations with inclusivity and aligns with merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'kitchen',
  NAME: 'Kitchen',
  DESCRIPTION: 'Prepares food for dine-in, takeaway, and delivery.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'caterer', 'cafe', 'bakery'],

  RESPONSIBILITIES: [
    'Prepare pre-ordered and extra food (mtables)',
    'Prepare delivery/takeaway food (munch)',
    'Log gamification points for prep speed'
  ],

  PERMISSIONS: ['view_orders', 'update_order_statuses', 'view_wallet', 'request_withdrawal', 'log_gamification'],

  TASK_TYPES: {
    mtables: ['prep_order'],
    munch: ['prep_order'],
    mevents: ['event_food_prep']
  },

  REQUIRED_CERTIFICATIONS: ['food_safety', 'halal_certification'],

  TRAINING_CATEGORIES: ['food_safety', 'financial'],

  GAMIFICATION_ACTIONS: [
    { action: 'timely_prep', points: 15, walletCredit: 0.50 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['prep_time', 'task_completion_rate'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};