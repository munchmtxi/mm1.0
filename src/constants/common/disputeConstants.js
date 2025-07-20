'use strict';

module.exports = {
  DISPUTE_STATUSES: {
    PENDING: 'PENDING',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED'
  },
  ISSUE_TYPES: ['BOOKING', 'PAYMENT', 'SERVICE_QUALITY', 'PARKING', 'DINING', 'STAY', 'TICKET', 'OTHER'],
  RESOLUTION_TYPES: ['REFUND', 'COMPENSATION', 'APOLOGY', 'NO_ACTION', 'ACCOUNT_CREDIT', 'REPLACEMENT', 'ROOM_UPGRADE', 'TICKET_UPGRADE'],
  NOTIFICATION_TYPES: {
    DISPUTE_CREATED: 'dispute_created',
    DISPUTE_RESOLVED: 'dispute_resolved',
    DISPUTE_CLOSED: 'dispute_closed',
    STAY_DISPUTE_CREATED: 'stay_dispute_created',
    TICKET_DISPUTE_CREATED: 'ticket_dispute_created'
  },
  PRIORITY_LEVELS: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH'
  },
  AUDIT_TYPES: {
    DISPUTE_CREATED: 'dispute_created',
    DISPUTE_RESOLVED: 'dispute_resolved',
    DISPUTE_CLOSED: 'dispute_closed',
    STAY_DISPUTE_CREATED: 'stay_dispute_created',
    TICKET_DISPUTE_CREATED: 'ticket_dispute_created'
  },
  ERROR_CODES: {
    INVALID_ISSUE: 'invalid_issue',
    MAX_DISPUTES_EXCEEDED: 'max_disputes_exceeded',
    INVALID_CUSTOMER: 'invalid_customer',
    UNAUTHORIZED_DISPUTE: 'unauthorized_dispute',
    INVALID_SERVICE: 'invalid_service',
    DISPUTE_NOT_FOUND: 'dispute_not_found',
    INVALID_RESOLUTION: 'invalid_resolution',
    DISPUTE_ALREADY_RESOLVED: 'dispute_already_resolved',
    DISPUTE_CREATION_FAILED: 'dispute_creation_failed',
    DISPUTE_RESOLUTION_FAILED: 'dispute_resolution_failed',
    DISPUTE_CANCELLATION_FAILED: 'dispute_cancellation_failed',
    PARKING_DISPUTES_NOT_FOUND: 'parking_disputes_not_found',
    STAY_DISPUTES_NOT_FOUND: 'stay_disputes_not_found',
    TICKET_DISPUTES_NOT_FOUND: 'ticket_disputes_not_found'
  },
  SUCCESS_MESSAGES: {
    DISPUTE_CREATED: 'Dispute created successfully.',
    DISPUTE_RESOLVED: 'Dispute resolved successfully.',
    DISPUTE_CLOSED: 'Dispute closed successfully.',
    DISPUTE_STATUS_RETRIEVED: 'Dispute status retrieved successfully.',
    PARKING_DISPUTES_RETRIEVED: 'Parking disputes retrieved successfully.',
    STAY_DISPUTES_RETRIEVED: 'Stay disputes retrieved successfully.',
    TICKET_DISPUTES_RETRIEVED: 'Ticket disputes retrieved successfully.'
  },
  DISPUTE_SETTINGS: {
    MAX_DISPUTES_PER_DAY: 3,
    MAX_ISSUE_LENGTH: 500
  }
};