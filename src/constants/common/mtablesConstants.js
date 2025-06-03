/**
 * mtablesConstants.js
 *
 * Defines constants for the Mtables service, focusing on table bookings, pre-orders, and group coordination.
 * Supports friend invites, bill splitting, and in-dining orders. Aligns with customerConstants.js, munchConstants.js, and rideConstants.js.
 *
 * Last Updated: June 1, 2025
 */

'use strict';

module.exports = {
  // Table Statuses
  TABLE_STATUSES: ['available', 'reserved', 'occupied', 'maintenance'],

  // In-Dining Order Statuses
  IN_DINING_STATUSES: ['confirmed', 'preparing', 'served', 'closed'],

  // Booking Types
  BOOKING_TYPES: ['table'],

  // Check-In Methods
  CHECK_IN_METHODS: ['qr_code', 'manual'],

  // Table Management Settings
  TABLE_MANAGEMENT: {
    MIN_TABLE_CAPACITY: 1,
    MAX_TABLE_CAPACITY: 20,
    LOCATION_TYPES: ['indoor', 'outdoor', 'rooftop', 'balcony', 'window', 'bar'],
    TABLE_TYPES: ['standard', 'booth', 'high_top', 'bar', 'lounge', 'private'],
    SEATING_PREFERENCES: [
      'no_preference', 'indoor', 'outdoor', 'rooftop', 'balcony', 'window',
      'booth', 'high_top', 'bar', 'lounge', 'private'
    ],
  },

  // Booking Policies
  BOOKING_POLICIES: {
    MIN_BOOKING_HOURS: 1,
    MAX_BOOKING_HOURS: 4,
    CANCELLATION_WINDOW_HOURS: 24,
    EXTENSION_LIMIT_MINUTES: 120,
    MIN_DEPOSIT_PERCENTAGE: 10,
  },

  // Customer Support Settings
  SUPPORT_SETTINGS: {
    ISSUE_TYPES: ['booking', 'order', 'payment', 'table'],
    TICKET_STATUSES: ['open', 'in_progress', 'resolved', 'escalated', 'closed'],
    PRIORITIES: ['low', 'medium', 'high'],
    MAX_TICKET_DESCRIPTION_LENGTH: 1000,
  },

  // Staff Settings
  STAFF_SETTINGS: {
    AVAILABILITY_STATUSES: ['available', 'unavailable', 'on_break'],
  },

  // Group Coordination Settings
  GROUP_SETTINGS: {
    MAX_FRIENDS_PER_BOOKING: 10,
    INVITE_STATUSES: ['invited', 'accepted', 'declined', 'removed'],
    INVITE_METHODS: ['app', 'sms', 'email'],
    BILL_SPLIT_TYPES: ['equal', 'custom', 'itemized'],
    MAX_SPLIT_PARTICIPANTS: 10,
  },

  // Pre-Order Settings
  ORDER_SETTINGS: {
    MAX_GROUP_SIZE: 20,
    MIN_PRE_ORDER_LEAD_TIME_MINUTES: 30,
    ALLOWED_DIETARY_FILTERS: ['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal'],
  },

  // Cart Settings
  CART_SETTINGS: {
    MAX_ITEMS_PER_CART: 50,
    MIN_QUANTITY_PER_ITEM: 1,
    MAX_QUANTITY_PER_ITEM: 20,
  },

  // Feedback Settings
  FEEDBACK_SETTINGS: {
    MIN_RATING: 1,
    MAX_RATING: 5,
    POSITIVE_RATING_THRESHOLD: 3,
  },

  // Financial Settings
  FINANCIAL_SETTINGS: {
    MIN_DEPOSIT_AMOUNT: 10,
    MAX_DEPOSIT_AMOUNT: 500,
    DEPOSIT_TRANSACTION_TYPE: 'deposit',
  },

  // Customer Settings
  CUSTOMER_SETTINGS: {
    MAX_ACTIVE_BOOKINGS: 5,
  },

  // Discount and Modifier Types
  DISCOUNT_TYPES: ['percentage', 'flat', 'bogo', 'seasonal', 'loyalty', 'bulk_discount', 'early_bird', 'clearance'],
  MODIFIER_TYPES: ['size', 'spiciness', 'extras', 'toppings', 'sauces', 'cooking_preference', 'temperature', 'side_choices', 'dressings'],

  // Promotion Settings
  PROMOTION_SETTINGS: {
    PROMOTION_TYPES: ['percentage', 'flat', 'bogo', 'discount'],
    RULE_TYPES: ['product_quantity', 'category', 'customer_type', 'loyalty_points'],
    MAX_REDEMPTIONS_PER_CUSTOMER: 5,
    MIN_DISCOUNT_AMOUNT: 1,
  },

  // Time Slot Settings
  TIME_SLOT_SETTINGS: {
    DAYS_OF_WEEK: { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 },
    SLOT_TYPES: ['regular', 'special', 'holiday', 'event'],
  },

  // Error Codes
  ERROR_CODES: {
    INVALID_BOOKING_DETAILS: 'INVALID_BOOKING_DETAILS',
    INVALID_PARTY_SIZE: 'INVALID_PARTY_SIZE',
    TABLE_NOT_AVAILABLE: 'TABLE_NOT_AVAILABLE',
    BOOKING_NOT_FOUND: 'BOOKING_NOT_FOUND',
    BOOKING_CREATION_FAILED: 'BOOKING_CREATION_FAILED',
    BOOKING_UPDATE_FAILED: 'BOOKING_UPDATE_FAILED',
    BOOKING_CANCELLATION_FAILED: 'BOOKING_CANCELLATION_FAILED',
    CHECK_IN_FAILED: 'CHECK_IN_FAILED',
    MAX_BOOKINGS_EXCEEDED: 'MAX_BOOKINGS_EXCEEDED',
    CANCELLATION_WINDOW_EXPIRED: 'CANCELLATION_WINDOW_EXPIRED',
    INVALID_CUSTOMER_ID: 'INVALID_CUSTOMER_ID',
    INVALID_FEEDBACK_RATING: 'INVALID_FEEDBACK_RATING',
    INVALID_FRIEND_INVITE: 'INVALID_FRIEND_INVITE',
    MAX_FRIENDS_EXCEEDED: 'MAX_FRIENDS_EXCEEDED',
    INVALID_BILL_SPLIT: 'INVALID_BILL_SPLIT',
    FRIEND_NOT_FOUND: 'FRIEND_NOT_FOUND',
    FEEDBACK_SUBMISSION_FAILED: 'FEEDBACK_SUBMISSION_FAILED',
    PARTY_MEMBER_ADDITION_FAILED: 'PARTY_MEMBER_ADDITION_FAILED',
    TABLE_SEARCH_FAILED: 'TABLE_SEARCH_FAILED',
    PAYMENT_PROCESSING_FAILED: 'PAYMENT_PROCESSING_FAILED',
    REFUND_PROCESSING_FAILED: 'REFUND_PROCESSING_FAILED',
  },

  // Success Messages
  SUCCESS_MESSAGES: [
    'Booking created',
    'Booking updated',
    'Booking cancelled',
    'Check-in confirmed',
    'Booking history retrieved',
    'Feedback submitted',
    'Party member added',
    'Tables retrieved',
    'Payment processed',
    'Refund processed',
    'Bill split processed',
  ],
};