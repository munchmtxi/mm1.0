/**
 * frontOfHouseConstants.js
 *
 * Defines constants for the Front of House staff role, handling customer-facing tasks like
 * check-ins, orders, and support for restaurant, cafe, and grocery merchants. Supports global
 * (Malawi, Tanzania, Kenya, Mozambique, Nigeria, South Africa, India, Brazil) with inclusivity
 * (e.g., halal filters) and aligns with merchantConstants.js, driverConstants.js, etc.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Role Definition
  STAFF_ROLE: 'front_of_house',
  NAME: 'Front of House',
  DESCRIPTION: 'Handles customer-facing tasks like check-ins, orders, and support.',
  SUPPORTED_MERCHANT_TYPES: ['restaurant', 'cafe', 'grocery'],

  // Responsibilities
  RESPONSIBILITIES: [
    'Process check-ins and manage bookings (mtables)',
    'Handle pre-orders, takeaway confirmations (munch)',
    'Coordinate driver pickups (mtxi)',
    'Address customer inquiries',
    'Log gamification points'
  ],

  // Permissions
  PERMISSIONS: [
    'manage_bookings', 'process_orders', 'manage_check_ins', 'handle_support_requests',
    'view_customer_data', 'coordinate_drivers', 'view_wallet', 'request_withdrawal',
    'log_gamification', 'escalate_issues'
  ],

  // Task Types
  TASK_TYPES: {
    mtables: ['check_in', 'booking_update', 'table_assignment', 'pre_order', 'extra_order', 'resolve_dispute'],
    munch: ['takeaway_confirm', 'resolve_dispute'],
    mtxi: ['driver_pickup'],
    mevents: ['event_check_in']
  },

  // Certifications
  REQUIRED_CERTIFICATIONS: ['financial_compliance'],

  // Training
  TRAINING_CATEGORIES: ['customer_service', 'financial'],

  // Gamification
  GAMIFICATION_ACTIONS: [
    { action: 'check_in_log', points: 10, walletCredit: 0.40 },
    { action: 'waitlist_resolution', points: 12, walletCredit: 0.40 },
    { action: 'task_completion', points: 10, walletCredit: 0.30 },
    { action: 'performance_improvement', points: 20, walletCredit: 0.60 }
  ],

  // Analytics Metrics
  ANALYTICS_METRICS: ['task_completion_rate', 'customer_satisfaction', 'checkout_speed'],

  // Notification Types
  NOTIFICATION_TYPES: ['task_assignment', 'shift_update', 'wallet_update', 'profile_updated', 'announcement'],

  // Error Codes
  ERROR_CODES: ['PERMISSION_DENIED', 'TASK_ASSIGNMENT_FAILED', 'INVALID_BRANCH'],

  // Success Messages
  SUCCESS_MESSAGES: ['Task completed', 'Gamification points awarded']
};