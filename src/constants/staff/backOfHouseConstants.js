/**
 * backOfHouseConstants.js
 *
 * Defines constants for the Back of House staff role, managing operational tasks like
 * inventory and supply monitoring for restaurant, cafe, grocery, and dark_kitchen merchants.
 * Supports global operations with inclusivity and aligns with merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'back_of_house',
  NAME: 'Back of House',
  DESCRIPTION: 'Manages operational tasks like inventory and supply monitoring.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'grocery', 'dark_kitchen'],

  RESPONSIBILITIES: [
    'Monitor dining supplies and inventory (mtables, munch)',
    'Prepare delivery packages and verify driver credentials (munch, mtxi)',
    'Process restocking alerts'
  ],

  PERMISSIONS: [
    'update_inventory', 'manage_supplies', 'process_delivery_packages',
    'verify_driver_credentials', 'view_restocking_alerts', 'view_wallet',
    'request_withdrawal', 'log_gamification'
  ],

  TASK_TYPES: {
    mtables: ['supply_monitor', 'restock_request'],
    munch: ['update_inventory', 'prepare_delivery_package', 'restock_alert'],
    mtxi: ['verify_driver']
  },

  REQUIRED_CERTIFICATIONS: ['food_safety', 'financial_compliance'],

  TRAINING_CATEGORIES: ['food_safety', 'financial', 'operational'],

  GAMIFICATION_ACTIONS: [
    { action: 'inventory_update', points: 10, walletCredit: 0.30 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['inventory_accuracy', 'task_completion_rate'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};