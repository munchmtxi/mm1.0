/**
 * cashierConstants.js
 *
 * Defines constants for the Cashier staff role, processing sales and customer inquiries for
 * grocery and cafe merchants. Supports global operations with inclusivity and aligns with
 * merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'cashier',
  NAME: 'Cashier',
  DESCRIPTION: 'Processes sales and customer inquiries.',
  SUPPORTED_MERCHANT_TYPES: ['grocery', 'cafe'],

  RESPONSIBILITIES: [
    'Process checkouts and handle inquiries (munch)',
    'Log gamification points for checkout speed'
  ],

  PERMISSIONS: ['process_checkout', 'handle_inquiries', 'view_wallet', 'request_withdrawal', 'log_gamification'],

  TASK_TYPES: {
    munch: ['process_checkout', 'resolve_dispute']
  },

  REQUIRED_CERTIFICATIONS: ['financial_compliance'],

  TRAINING_CATEGORIES: ['customer_service', 'financial'],

  GAMIFICATION_ACTIONS: [
    { action: 'checkout_processing', points: 10, walletCredit: 0.30 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['checkout_speed', 'customer_satisfaction'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};