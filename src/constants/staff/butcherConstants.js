/**
 * butcherConstants.js
 *
 * Defines constants for the Butcher staff role, preparing meat orders for butcher merchants.
 * Supports global operations with inclusivity and aligns with merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'butcher',
  NAME: 'Butcher',
  DESCRIPTION: 'Prepares meat orders for customers.',
  SUPPORTED_MERCHANT_TYPES: ['butcher'],

  RESPONSIBILITIES: [
    'Prepare meat orders with dietary compliance (munch)',
    'Update inventory for meat supplies',
    'Log gamification points for prep accuracy'
  ],

  PERMISSIONS: ['prepare_meat', 'update_inventory', 'view_wallet', 'request_withdrawal', 'log_gamification'],

  TASK_TYPES: {
    munch: ['prepare_meat', 'update_inventory']
  },

  REQUIRED_CERTIFICATIONS: ['food_safety', 'halal_certification'],

  TRAINING_CATEGORIES: ['food_safety', 'financial'],

  GAMIFICATION_ACTIONS: [
    { action: 'timely_prep', points: 15, walletCredit: 0.50 },
    { action: 'meat_preparation', points: 15, walletCredit: 0.50 },
    { action: 'inventory_update', points: 10, walletCredit: 0.30 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['prep_time', 'inventory_accuracy'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};