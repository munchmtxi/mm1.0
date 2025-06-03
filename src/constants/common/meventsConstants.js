/**
 * meventsConstants.js
 *
 * Defines constants for the Mevents System, covering event planning and group coordination.
 * Supports customer interactions and inclusivity (e.g., halal filter). Aligns with customerConstants.js,
 * munchConstants.js, mtablesConstants.js, and rideConstants.js.
 *
 * Last Updated: May 27, 2025
 */

'use strict';

module.exports = {
  // Event Statuses
  EVENT_STATUSES: ['draft', 'confirmed', 'completed', 'cancelled'],

  // Event Occasions
  EVENT_OCCASIONS: ['corporate', 'pleasure', 'travel', 'other'],

  // Payment Types
  PAYMENT_TYPES: ['solo', 'split'],

  // Participant Statuses
  PARTICIPANT_STATUSES: ['invited', 'accepted', 'declined'],

  // Event Settings
  EVENT_SETTINGS: {
    MAX_PARTICIPANTS: 50,
    MAX_SERVICES: 20,
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 1000
  },

  // Error Codes
  ERROR_CODES: [
    'EVENT_NOT_FOUND', 'INVALID_CUSTOMER', 'INVALID_PARTICIPANT', 'INVALID_SERVICE',
    'UNAUTHORIZED_EVENT', 'MAX_PARTICIPANTS_EXCEEDED', 'MAX_SERVICES_EXCEEDED',
    'INVALID_PAYMENT_TYPE', 'INSUFFICIENT_FUNDS', 'BILL_SPLIT_FAILED', 'INVALID_EVENT'
  ],

  // Success Messages
  SUCCESS_MESSAGES: [
    'Event created', 'Event updated', 'Event cancelled', 'Participant added',
    'Bill processed', 'Chat enabled', 'Points awarded'
  ]
};