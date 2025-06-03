/**
 * managerConstants.js
 *
 * Defines constants for the Manager staff role, overseeing operations, staff, and financial
 * approvals for all merchant types. Supports global operations with inclusivity and aligns
 * with merchantConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  STAFF_ROLE: 'manager',
  NAME: 'Manager',
  DESCRIPTION: 'Oversees operations, staff, and financial approvals.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'dark_kitchen', 'butcher', 'grocery', 'caterer', 'cafe', 'bakery'],

  RESPONSIBILITIES: [
    'Approve staff withdrawals and manage schedules',
    'View analytics and performance reports',
    'Resolve escalated disputes',
    'Monitor compliance and certifications'
  ],

  PERMISSIONS: [
    'manage_bookings', 'process_orders', 'update_inventory', 'view_analytics',
    'manage_staff', 'approve_withdrawals', 'view_wallet', 'request_withdrawal',
    'log_gamification', 'resolve_disputes'
  ],

  TASK_TYPES: {
    all: ['approve_withdrawal', 'manage_schedule', 'resolve_dispute', 'view_analytics']
  },

  REQUIRED_CERTIFICATIONS: ['financial_compliance'],

  TRAINING_CATEGORIES: ['customer_service', 'financial', 'operational'],

  GAMIFICATION_ACTIONS: [
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  ANALYTICS_METRICS: ['task_completion_rate', 'customer_satisfaction', 'inventory_accuracy', 'delivery_performance'],

  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};