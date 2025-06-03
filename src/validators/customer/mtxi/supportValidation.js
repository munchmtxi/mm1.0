'use strict';

const { body, param } = require('express-validator');
const customerConstants = require('@constants/customer/customerConstants');
const tipConstants = require('@constants/customer/tipConstants');
const { validate } = require('@utils/validation');

const validateCreateSupportTicket = [
  body('serviceType').isIn(tipConstants.TIP_SETTINGS.SERVICE_TYPES),
  body('issueType').isIn(['PAYMENT_ISSUE', 'SERVICE_QUALITY', 'CANCELLATION', 'DELIVERY_ISSUE', 'BOOKING_ISSUE', 'OTHER']),
  body('description').isString().notEmpty(),
  body('rideId').optional().isInt(),
  body('orderId').optional().isInt(),
  body('bookingId').optional().isInt(),
  body('groupCustomerIds').optional().isArray(),
  body('groupCustomerIds.*').optional().isInt(),
  body().custom((value) => {
    if ((value.rideId && (value.orderId || value.bookingId)) || (value.orderId && value.bookingId) || (!value.rideId && !value.orderId && !value.bookingId)) {
      throw new Error('Must provide exactly one of rideId, orderId, or bookingId');
    }
    return true;
  }),
  validate,
];

const validateTrackTicketStatus = [
  param('ticketId').isInt(),
  validate,
];

const validateEscalateTicket = [
  body('ticketId').isInt(),
  validate,
];

const validateCloseTicket = [
  body('ticketId').isInt(),
  validate,
];

module.exports = {
  validateCreateSupportTicket,
  validateTrackTicketStatus,
  validateEscalateTicket,
  validateCloseTicket,
};