'use strict';

/**
 * staffGamificationConstants.js
 *
 * Defines constants for gamification across all staff roles (e.g., server, chef, driver, etc.),
 * supporting staff engagement through actions, points, leaderboards, and rewards. Integrates with
 * wallet operations, analytics, notifications, and socket events. Supports 15 countries with localization
 * handled by localizationConstants.js and aligns with merchantGamificationConstants.js,
 * driverGamificationConstants.js, and customerGamificationConstants.js.
 *
 * Last Updated: June 25, 2025
 */

module.exports = {
  // Gamification Configuration
  GAMIFICATION_SETTINGS: {
    ENABLED: true,
    MAX_DAILY_ACTIONS: 50, // Maximum gamified actions per staff per day
    POINTS_EXPIRY_DAYS: 365, // Points expire after 1 year
    LEADERBOARD_TYPES: ['global', 'regional', 'role_specific', 'merchant_specific'], // Leaderboard scopes
    LEADERBOARD_UPDATE_FREQUENCY_HOURS: 24, // Daily leaderboard updates
    AI_PERSONALIZATION: true, // AI-driven reward and action suggestions
    SOCIAL_SHARING: ['leaderboard_rank', 'achievement_unlocked', 'reward_redeemed'], // Shareable gamification events
  },

  // Gamification Actions
  GAMIFICATION_ACTIONS: {
    GENERAL: [
      { action: 'task_completed', name: 'Task Completed', points: 5, roles: ['all'] },
      { action: 'shift_completed', name: 'Shift Completed', points: 10, roles: ['all'] },
      { action: 'training_completed', name: 'Training Completed', points: 15, roles: ['all'] },
      { action: 'customer_feedback_received', name: 'Customer Feedback Received', points: 8, roles: ['all'] },
    ],
    SERVER: [
      { action: 'serve_table', name: 'Table Served', points: 5, roles: ['server'], service: 'mtables' },
      { action: 'check_in', name: 'Customer Check-In', points: 3, roles: ['server'], service: 'mtables' },
      { action: 'pre_order', name: 'Pre-Order Processed', points: 5, roles: ['server'], service: 'mtables' },
      { action: 'takeaway_confirm', name: 'Takeaway Confirmed', points: 4, roles: ['server'], service: 'munch' },
    ],
    HOST: [
      { action: 'check_in', name: 'Customer Check-In', points: 3, roles: ['host'], service: 'mtables' },
      { action: 'booking_update', name: 'Booking Updated', points: 5, roles: ['host'], service: 'mtables' },
      { action: 'table_assignment', name: 'Table Assigned', points: 4, roles: ['host'], service: 'mtables' },
      { action: 'takeaway_confirm', name: 'Takeaway Confirmed', points: 4, roles: ['host'], service: 'munch' },
    ],
    CHEF: [
      { action: 'prep_order', name: 'Order Prepared', points: 8, roles: ['chef'], service: ['mtables', 'munch'] },
      { action: 'event_food_prep', name: 'Event Food Prepared', points: 15, roles: ['chef'], service: 'mevents' },
    ],
    MANAGER: [
      { action: 'approve_withdrawal', name: 'Withdrawal Approved', points: 10, roles: ['manager'], service: 'all' },
      { action: 'manage_schedule', name: 'Schedule Managed', points: 8, roles: ['manager'], service: 'all' },
      { action: 'resolve_dispute', name: 'Dispute Resolved', points: 12, roles: ['manager'], service: 'all' },
      { action: 'view_analytics', name: 'Analytics Viewed', points: 5, roles: ['manager'], service: 'all' },
    ],
    BUTCHER: [
      { action: 'prepare_meat', name: 'Meat Prepared', points: 8, roles: ['butcher'], service: 'munch' },
      { action: 'customize_order', name: 'Order Customized', points: 10, roles: ['butcher'], service: 'munch' },
      { action: 'update_inventory', name: 'Inventory Updated', points: 5, roles: ['butcher'], service: 'munch' },
    ],
    BARISTA: [
      { action: 'prepare_beverage', name: 'Beverage Prepared', points: 5, roles: ['barista'], service: 'munch' },
      { action: 'prepare_food', name: 'Food Prepared', points: 6, roles: ['barista'], service: 'munch' },
      { action: 'update_inventory', name: 'Inventory Updated', points: 5, roles: ['barista'], service: 'munch' },
    ],
    STOCK_CLERK: [
      { action: 'stock_shelves', name: 'Shelves Stocked', points: 6, roles: ['stock_clerk'], service: 'munch' },
      { action: 'update_inventory', name: 'Inventory Updated', points: 5, roles: ['stock_clerk'], service: 'munch' },
      { action: 'verify_delivery', name: 'Delivery Verified', points: 7, roles: ['stock_clerk'], service: 'munch' },
    ],
    PICKER: [
      { action: 'pick_order', name: 'Order Picked', points: 5, roles: ['picker'], service: 'munch' },
      { action: 'handle_substitutions', name: 'Substitutions Handled', points: 6, roles: ['picker'], service: 'munch' },
    ],
    CASHIER: [
      { action: 'process_checkout', name: 'Checkout Processed', points: 5, roles: ['cashier'], service: 'munch' },
      { action: 'resolve_dispute', name: 'Dispute Resolved', points: 8, roles: ['cashier'], service: 'munch' },
    ],
    DRIVER: [
      { action: 'process_delivery', name: 'Delivery Processed', points: 10, roles: ['driver'], service: 'mtxi' },
      { action: 'verify_order', name: 'Order Verified', points: 5, roles: ['driver'], service: 'mtxi' },
      { action: 'delivery_handover', name: 'Delivery Handed Over', points: 8, roles: ['driver'], service: 'munch' },
    ],
    PACKAGER: [
      { action: 'package_order', name: 'Order Packaged', points: 6, roles: ['packager'], service: ['munch', 'mtxi'] },
      { action: 'update_inventory', name: 'Inventory Updated', points: 5, roles: ['packager'], service: ['munch'] },
      { action: 'verify_driver', name: 'Driver Verified', points: 5, roles: ['packager'], service: 'mtxi' },
    ],
    EVENT_STAFF: [
      { action: 'event_setup', name: 'Event Setup Completed', points: 12, roles: ['event_staff'], service: 'mevents' },
      { action: 'serve_event', name: 'Event Served', points: 10, roles: ['event_staff'], service: 'mevents' },
      { action: 'prep_order', name: 'Order Prepared', points: 8, roles: ['event_staff'], service: 'munch' },
    ],
    CONSULTANT: [
      { action: 'client_consultation', name: 'Client Consultation Conducted', points: 15, roles: ['consultant'], service: 'mevents' },
      { action: 'customize_menu', name: 'Menu Customized', points: 10, roles: ['consultant'], service: 'mevents' },
    ],
    FRONT_OF_HOUSE: [
      { action: 'check_in', name: 'Customer Check-In', points: 3, roles: ['front_of_house'], service: ['mtables', 'mevents'] },
      { action: 'booking_update', name: 'Booking Updated', points: 5, roles: ['front_of_house'], service: 'mtables' },
      { action: 'table_assignment', name: 'Table Assigned', points: 4, roles: ['front_of_house'], service: 'mtables' },
      { action: 'pre_order', name: 'Pre-Order Processed', points: 5, roles: ['front_of_house'], service: 'mtables' },
      { action: 'takeaway_confirm', name: 'Takeaway Confirmed', points: 4, roles: ['front_of_house'], service: 'munch' },
      { action: 'driver_pickup', name: 'Driver Pickup Coordinated', points: 6, roles: ['front_of_house'], service: 'mtxi' },
    ],
    BACK_OF_HOUSE: [
      { action: 'update_inventory', name: 'Inventory Updated', points: 5, roles: ['back_of_house'], service: 'munch' },
      { action: 'prepare_delivery_package', name: 'Delivery Package Prepared', points: 6, roles: ['back_of_house'], service: 'munch' },
      { action: 'restock_alert', name: 'Restock Alert Processed', points: 5, roles: ['back_of_house'], service: 'munch' },
      { action: 'supply_monitor', name: 'Supplies Monitored', points: 4, roles: ['back_of_house'], service: 'mtables' },
      { action: 'restock_request', name: 'Restock Requested', points: 5, roles: ['back_of_house'], service: 'mtables' },
      { action: 'verify_driver', name: 'Driver Verified', points: 5, roles: ['back_of_house'], service: 'mtxi' },
    ],
  },

  // Reward Categories
  REWARD_CATEGORIES: [
    { type: 'cash_bonus', name: 'Cash Bonus', min_points: 50, max_points: 5000, currency: 'dynamic' },
    { type: 'free_services', name: 'Free Services', min_points: 30, max_points: 1000, services: ['munch_delivery', 'mtables_booking', 'mevents_support'] },
    { type: 'priority_tasks', name: 'Priority Task Assignments', min_points: 40, max_points: 500, duration_days: 30 },
    { type: 'training_access', name: 'Training Course Access', min_points: 100, max_points: 1000, modules: ['customer_service', 'food_safety', 'event_management'] },
  ],

  // Reward Redemption Settings
  REWARD_REDEMPTION_SETTINGS: {
    MIN_REDEMPTION_POINTS: 30,
    MAX_REDEMPTION_PER_DAY: 3,
    REDEMPTION_COOLDOWN_HOURS: 12,
    AUTO_REDEEM_ENABLED: false,
    AUTO_REDEEM_THRESHOLD_POINTS: 500,
    REDEMPTION_AUDIT_LOG: true,
  },

  // Achievements
  ACHIEVEMENT_TYPES: [
    { id: 'first_task', name: 'First Task Completed', points: 20, criteria: { action: 'task_completed', count: 1 } },
    { id: 'task_master', name: 'Task Master', points: 100, criteria: { action: 'task_completed', count: 500 } },
    { id: 'shift_leader', name: 'Shift Leader', points: 50, criteria: { action: 'shift_completed', count: 50 } },
    { id: 'training_expert', name: 'Training Expert', points: 75, criteria: { action: 'training_completed', count: 5 } },
    { id: 'customer_hero', name: 'Customer Hero', points: 80, criteria: { action: 'customer_feedback_received', count: 25 } },
  ],

  // Notifications
  NOTIFICATION_CONSTANTS: {
    NOTIFICATION_TYPES: [
      'points_earned',
      'reward_redeemed',
      'achievement_unlocked',
      'leaderboard_rank_update',
      'gamification_milestone',
    ],
    DELIVERY_METHODS: ['push', 'email', 'sms', 'whatsapp'],
    PRIORITY_LEVELS: ['low', 'medium', 'high'],
    MAX_NOTIFICATIONS_PER_HOUR: 10,
    RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL_SECONDS: 30,
  },

  // Analytics
  ANALYTICS_CONSTANTS: {
    METRICS: [
      'points_earned',
      'rewards_redeemed',
      'task_completion_rate',
      'leaderboard_participation',
      'achievement_completion_rate',
    ],
    REPORT_FORMATS: ['pdf', 'csv', 'json', 'dashboard'],
    DATA_RETENTION_DAYS: 730,
    RECOMMENDATION_CATEGORIES: ['task_optimization', 'reward_preferences', 'staff_engagement'],
  },

  // Error Codes
  ERROR_CODES: [
    'INVALID_ACTION',
    'POINTS_EXPIRED',
    'REDEMPTION_LIMIT_EXCEEDED',
    'INVALID_REWARD_TYPE',
    'GAMIFICATION_DISABLED',
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'points_earned',
    'reward_redeemed',
    'achievement_unlocked',
    'leaderboard_updated',
    'task_completed',
  ],
};