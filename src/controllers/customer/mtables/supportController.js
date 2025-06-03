'use strict';

const { sequelize } = require('@models');
const {
  createSupportTicket,
  trackTicketStatus,
  escalateTicket,
} = require('@services/customer/mtables/supportService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const { formatMessage } = require('@utils/localization/localization');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const { Customer } = require('@models');

const createSupportTicket = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId, orderId, issueType, description } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Creating support ticket', { customerId, issueType });

  const transaction = await sequelize.transaction();
  try {
    const ticket = await createSupportTicket({
      customerId,
      bookingId,
      orderId,
      issueType,
      description,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'support.ticket.created',
      params: { ticketNumber: ticket.ticket_number },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.support_response,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
        ticketId: ticket.id,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUPPORT_TICKET_CREATED || 'support:ticket_created',
        details: { ticketId: ticket.id, issueType, bookingId, orderId },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'support:ticket_created', {
      userId: customer.user_id,
      role: 'customer',
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(
        a => a.action === 'support_ticket_created'
      ) || { action: 'support_ticket_created', points: 5 };
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points || 5,
          metadata: { io, role: 'customer', ticketId: ticket.id },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Support ticket created') || 'Support ticket created',
      data: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Support ticket creation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'SUPPORT_TICKET_CREATION_FAILED') || 'SUPPORT_TICKET_CREATION_FAILED'));
  }
});

const trackTicketStatus = catchAsync(async (req, res, next) => {
  const ticketId = parseInt(req.params.ticketId, 10);
  const io = req.app.get('io');

  logger.info('Tracking ticket status', { ticketId });

  const transaction = await sequelize.transaction();
  try {
    const ticket = await trackTicketStatus({ ticketId, transaction });

    await socketService.emit(io, 'support:ticket_status', {
      userId: ticket.customer.user_id,
      role: 'customer',
      ticketId,
      status: ticket.status,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Ticket status tracked') || 'Ticket status tracked',
      data: ticket,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Ticket status tracking failed', { error: error.message, ticketId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'TICKET_STATUS_TRACKING_FAILED') || 'TICKET_STATUS_TRACKING_FAILED'));
  }
});

const escalateTicket = catchAsync(async (req, res, next) => {
  const ticketId = parseInt(req.params.ticketId, 10);
  const customerId = req.user.id;
  const io = req.app.get('io');

  logger.info('Escalating ticket', { ticketId, customerId });

  const transaction = await sequelize.transaction();
  try {
    const ticket = await escalateTicket({ ticketId, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'support.ticket.escalated',
      params: { ticketNumber: ticket.ticket_number },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.support_response,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
        ticketId,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUPPORT_TICKET_ESCALATED || 'support:ticket_escalated',
        details: { ticketId, assignedStaffId: ticket.assigned_staff_id },
        ipAddress: req.ip,
      },
      transaction
    );

    await socketService.emit(io, 'support:ticket_escalated', {
      userId: customer.user_id,
      role: 'customer',
      ticketId,
      status: ticket.status,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Ticket escalated') || 'Ticket escalated',
      data: { ticketId: ticket.id, status: ticket.status },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Ticket escalation failed', { error: error.message, ticketId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'TICKET_ESCALATION_FAILED') || 'TICKET_ESCALATION_FAILED'));
  }
});

module.exports = {
  createSupportTicket,
  trackTicketStatus,
  escalateTicket,
};