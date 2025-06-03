/**
 * disputeConstants.js
 *
 * Defines constants for the Dispute System, covering dispute management for services.
 * Aligns with customerConstants.js, munchConstants.js, mtablesConstants.js, meventsConstants.js, and rideConstants.js.
 *
 * Last Updated: May 27, 2025
 */

'use strict';

module.exports = {
  DISPUTE_STATUSES: ['pending', 'in_review', 'resolved', 'closed'],
  ISSUE_TYPES: ['service_quality', 'payment', 'cancellation', 'safety', 'other'],
  RESOLUTION_TYPES: ['refund', 'compensation', 'apology', 'no_action'],
  DISPUTE_SETTINGS: {
    MAX_ISSUE_LENGTH: 1000,
    SUPPORT_RESPONSE_TIME_HOURS: 24,
    MAX_DISPUTES_PER_DAY: 5
  },
  ERROR_CODES: [
    'DISPUTE_NOT_FOUND', 'DISPUTE_ALREADY_RESOLVED', 'INVALID_CUSTOMER',
    'INVALID_SERVICE', 'UNAUTHORIZED_DISPUTE', 'MAX_DISPUTES_EXCEEDED', 'INVALID_ISSUE'
  ],
  SUCCESS_MESSAGES: ['Dispute created', 'Dispute resolved', 'Dispute tracked', 'Points awarded']
};