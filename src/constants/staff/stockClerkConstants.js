/**
 * stockClerkConstants.js
 *
 * Defines constants for the Stock Clerk staff role, managing inventory and shelf stocking for
 * grocery merchants. Supports global operations with inclusivity and aligns with
 * merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'stock_clerk',
  NAME: 'Stock Clerk',
  DESCRIPTION: 'Manages inventory and shelf stocking.',
  SUPPORTED_MERCHANT_TYPES: ['grocery'],

  RESPONSIBILITIES: [
    'Restock shelves and track inventory (munch)',
    'Verify delivery accuracy',
    'Log gamification points for stocking efficiency'
  ],

  PERMISSIONS: ['stock_shelves', 'update_inventory', 'verify_deliveries', 'view_wallet', 'request_withdrawal', 'log_gamification'],

  TASK_TYPES: {
    munch: ['stock_shelves', 'update_inventory', 'verify_delivery']
  },

  REQUIRED_CERTIFICATIONS: ['financial_compliance'],

  TRAINING_CATEGORIES: ['financial', 'operational'],

  GAMIFICATION_ACTIONS: [
    { action: 'shelf_stocking', points: 10, walletCredit: 0.30 },
    { action: 'inventory_update', points: 10, walletCredit: 0.30 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['inventory_accuracy', 'task_completion_rate'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};