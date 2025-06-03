/**
 * driverConstants.js
 *
 * Defines constants for the Driver staff role, handling order deliveries for restaurant,
 * dark_kitchen, grocery, caterer, cafe, and bakery merchants. Supports global operations
 * with inclusivity and aligns with merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'driver',
  NAME: 'Driver',
  DESCRIPTION: 'Handles delivery of orders.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'grocery', 'caterer', 'cafe', 'bakery'],

  RESPONSIBILITIES: [
    'Pick up and deliver orders (mtxi)',
    'Log gamification points for delivery performance',
    'Verify order accuracy at pickup'
  ],

  PERMISSIONS: ['process_deliveries', 'verify_orders', 'view_wallet', 'request_withdrawal', 'log_gamification'],

  TASK_TYPES: {
    mtxi: ['process_delivery', 'verify_order'],
    munch: ['delivery_handover']
  },

  REQUIRED_CERTIFICATIONS: ['drivers_license', 'food_safety_driver'],

  TRAINING_CATEGORIES: ['food_safety', 'driver_training'],

  GAMIFICATION_ACTIONS: [
    { action: 'delivery_completion', points: 25, walletCredit: 0.60 },
    { action: 'batch_delivery', points: 15, walletCredit: 0.40 },
    { action: 'timely_pickup', points: 15, walletCredit: 0.40 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['delivery_performance', 'task_completion_rate'],

  NOTIFICATION_TYPES: ['delivery_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_DELIVERY_ASSIGNMENT'],

  SUCCESS_MESSAGES: ['Delivery completed', 'Gamification points awarded']
};