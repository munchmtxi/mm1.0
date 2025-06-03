'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/authMiddleware');

module.exports = {
  createSupportTicket: [authenticate, restrictTo('customer'), checkPermissions('create_support_ticket')],
  trackTicketStatus: [authenticate, restrictTo('customer'), checkPermissions('track_support_ticket')],
  escalateTicket: [authenticate, restrictTo('customer'), checkPermissions('escalate_support_ticket')],
};