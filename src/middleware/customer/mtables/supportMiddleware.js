'use strict';

const { authenticate, restrictTo, required } = require('@middleware/common/auth/authMiddleware');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const mtablesConstants = require('@constants/mtablesConstants');
const { SupportTicket } = require('@models');

const checkSupportAccess = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const ticketId = req.params.ticketId ? parseInt(req.params.ticketId, 10) : null;

  logger.info('Validating support access', { ticketId, customerId });

  if (ticketId) {
    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', 404, mtablesConstants.ERROR_CODES.find(c => c === 'TICKET_NOT_FOUND') || 'ticket_not_found');
    }
    if (ticket.customer_id !== customerId) {
      throw new AppError('Unauthorized', null, mtablesConstants.ERROR_CODES.find(c => c === 'PERMISSION_DENIED') || 'permission_denied');
    }
  }

  next();
});

module.exports = {
  authenticate,
  restrictTo,
  checkPermissions,
  checkSupportAccess,
};