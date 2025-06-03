/**
 * rideConstants.js
 *
 * Defines constants for the mtxi Ride System, covering ride management and group coordination.
 * Supports friend invites and bill splitting. Aligns with customerConstants.js, munchConstants.js, and mtablesConstants.js.
 *
 * Last Updated: May 27, 2025
 */

'use strict';

module.exports = {
  // Ride Statuses
  RIDE_STATUSES: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],

  // Ride Types
  RIDE_TYPES: ['standard', 'shared'],

  // Ride Configuration
  RIDE_SETTINGS: {
    MAX_PASSENGERS: 4,
    MIN_RIDE_DISTANCE_KM: 1,
    MAX_RIDE_DISTANCE_KM: 50,
    CANCELLATION_WINDOW_MINUTES: 5,
    TIMELY_PICKUP_WINDOW_MINUTES: 5,
    MAX_ACTIVE_RIDES_PER_CUSTOMER: 2
  },

  // Group Coordination Settings
  GROUP_SETTINGS: {
    MAX_FRIENDS_PER_RIDE: 4,
    INVITE_STATUSES: ['invited', 'accepted', 'declined', 'removed'],
    INVITE_METHODS: ['app', 'sms', 'email'],
    BILL_SPLIT_TYPES: ['equal', 'custom'],
    MAX_SPLIT_PARTICIPANTS: 4
  },

  // Shared Ride Settings
  SHARED_RIDE_SETTINGS: {
    MAX_PASSENGERS: 4,
    MAX_STOPS: 3,
    MAX_FRIENDS: 3,
    DEVIATION_LIMIT_PERCENTAGE: 20
  },

  // Location and Routing
  LOCATION_CONSTANTS: {
    UPDATE_FREQUENCY_SECONDS: 10,
    ROUTE_OPTIMIZATION: {
      MAX_DEVIATION_PERCENTAGE: 10,
      FUEL_EFFICIENCY_WEIGHT: 0.4,
      TIME_EFFICIENCY_WEIGHT: 0.6
    },
    MAP_SETTINGS: {
      DEFAULT_ZOOM_LEVEL: 15,
      MAX_WAYPOINTS: 10
    }
  },

  // Error Codes
  ERROR_CODES: [
    'INVALID_RIDE', 'RIDE_NOT_FOUND', 'PERMISSION_DENIED', 'PAYMENT_FAILED',
    'RIDE_BOOKING_FAILED', 'RIDE_CANCELLATION_FAILED', 'NO_DRIVERS_AVAILABLE',
    'RIDE_NOT_TRACKABLE', 'RIDE_NOT_CANCELLABLE', 'INVALID_LOCATION',
    'INVALID_FRIEND_INVITE', 'MAX_FRIENDS_EXCEEDED', 'INVALID_BILL_SPLIT', 'FRIEND_NOT_FOUND'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'Ride booked', 'Ride accepted', 'Ride completed', 'Ride cancelled',
    'Payment processed', 'Points awarded', 'Support ticket resolved',
    'Friend invited', 'Bill split processed'
  ]
};