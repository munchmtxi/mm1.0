/**
 * munchConstants.js
 *
 * Defines constants for the Munch service, focusing on food ordering, delivery, order subscriptions,
 * and group coordination. Supports friend invites and bill splitting. Aligns with customerConstants.js,
 * mtablesConstants.js, and rideConstants.js.
 *
 * Last Updated: May 27, 2025
 */

module.exports = {
  // Munch Service Configuration
  MUNCH_SETTINGS: {
    MAX_ACTIVE_ORDERS: 10
  },

  // Food Ordering
  ORDER_CONSTANTS: {
    ORDER_TYPES: ['dine_in', 'takeaway', 'delivery'],
    ORDER_STATUSES: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    ORDER_SETTINGS: {
      MAX_ORDER_ITEMS: 50,
      MIN_ORDER_AMOUNT: 5,
      ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'],
      CANCELLATION_WINDOW_MINUTES: 10
    }
  },

  // Group Coordination Settings
  GROUP_SETTINGS: {
    MAX_FRIENDS_PER_ORDER: 10,
    INVITE_STATUSES: ['invited', 'accepted', 'declined', 'removed'],
    INVITE_METHODS: ['app', 'sms', 'email'],
    BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized'],
    MAX_SPLIT_PARTICIPANTS: 10
  },

  // Food Delivery
  DELIVERY_CONSTANTS: {
    DELIVERY_STATUSES: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled'],
    DELIVERY_TYPES: ['standard', 'batch'],
    DELIVERY_SETTINGS: {
      MAX_DELIVERY_RADIUS_KM: 15,
      MIN_DELIVERY_TIME_MINUTES: 15,
      MAX_DELIVERY_TIME_MINUTES: 90,
      BATCH_DELIVERY_LIMIT: 5,
      TIMELY_PICKUP_WINDOW_MINUTES: 5
    },
    LOCATION_UPDATE_FREQUENCY_SECONDS: 10
  },

  // Order Subscriptions
  SUBSCRIPTION_CONSTANTS: {
    SUBSCRIPTION_PLANS: [
      { name: 'Basic', benefits: ['free_delivery', 'priority_ordering'], durationDays: 30 },
      { name: 'Premium', benefits: ['free_delivery', 'priority_ordering', 'exclusive_discounts'], durationDays: 30 }
    ],
    SUBSCRIPTION_STATUSES: ['active', 'paused', 'cancelled'],
    MAX_ACTIVE_SUBSCRIPTIONS: 1
  },

  // Error Codes
  ERROR_CODES: [
    'ORDER_NOT_FOUND', 'NO_DRIVER_ASSIGNED', 'ORDER_ALREADY_CANCELLED', 'CANNOT_CANCEL_ORDER',
    'INVALID_DIETARY_FILTER', 'SUBSCRIPTION_ALREADY_ACTIVE', 'INVALID_SUBSCRIPTION_PLAN',
    'INVALID_FRIEND_INVITE', 'MAX_FRIENDS_EXCEEDED', 'INVALID_BILL_SPLIT', 'FRIEND_NOT_FOUND'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'Order placed', 'Order cancelled', 'Delivery tracked', 'Driver message sent',
    'Subscription activated', 'Gamification points awarded', 'Payment completed',
    'Friend invited', 'Bill split processed'
  ]
};