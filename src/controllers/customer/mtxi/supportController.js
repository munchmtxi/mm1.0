'use strict';

const supportService = require('@services/customer/mtxi/supportService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { sequelize, Customer } = require('@models');

async function createSupportTicket(req, res) {
  const { serviceType, issueType, description, rideId, orderId, bookingId, groupCustomerIds } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const ticket = await supportService.createSupportTicket(customerId, {
      serviceType,
      issueType,
      description,
      rideId,
      orderId,
      bookingId,
      groupCustomerIds,
    }, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUPPORT_INTERACTION.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUPPORT_TICKET_CREATED,
      details: { ticketId: ticket.id, serviceType, issueType, rideId, orderId, bookingId, groupCustomerIds },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
      message: formatMessage('support.ticket.created', { ticketId: ticket.id, service: serviceType }),
    });

    if (groupCustomerIds) {
      for (const groupCustomerId of groupCustomerIds) {
        const groupCustomer = await Customer.findByPk(groupCustomerId, { transaction });
        await notificationService.sendNotification({
          userId: groupCustomer.user_id,
          type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
          message: formatMessage('support.ticket.created', { ticketId: ticket.id, service: serviceType }),
        });
      }
    }

    await socketService.emit('support:ticket_created', { userId: customerId, role: 'customer', ticketId: ticket.id });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Support ticket created',
      data: { ticketId: ticket.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 500, error.code || customerConstants.ERROR_CODES[6]);
  }
}

async function trackTicketStatus(req, res) {
  const { ticketId } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const status = await supportService.trackTicketStatus(ticketId, transaction);
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ticket status retrieved',
      data: status,
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[4]);
  }
}

async function escalateTicket(req, res) {
  const { ticketId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    await supportService.escalateTicket(ticketId, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.SUPPORT_INTERACTION.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TICKET_ESCALATED,
      details: { ticketId },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
      message: formatMessage('support.ticket.escalated', { ticketId }),
    });

    await socketService.emit('support:ticket_escalated', { userId: customerId, role: 'customer', ticketId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ticket escalated',
      data: { ticketId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[6]);
  }
}

async function closeTicket(req, res) {
  const { ticketId } = req.body;
  const customerId = req.user.id;
  const transaction = await sequelize.transaction();
  let gamificationError = null;

  try {
    const ticket = await supportService.closeTicket(customerId, ticketId, transaction);

    try {
      await pointService.awardPoints({
        userId: req.user.user_id,
        role: 'customer',
        action: customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.TICKET_CLOSURE.action,
        languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      });
    } catch (error) {
      gamificationError = error.message;
    }

    await auditService.logAction({
      userId: customerId.toString(),
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TICKET_CLOSED,
      details: { ticketId },
      ipAddress: req.ip,
    }, transaction);

    await notificationService.sendNotification({
      userId: req.user.user_id,
      type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
      message: formatMessage('support.ticket.closed', { ticketId }),
    });

    await socketService.emit('support:ticket_closed', { userId: customerId, role: 'customer', ticketId });
    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: 'Ticket closed',
      data: { ticketId, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(error.message, error.statusCode || 400, error.code || customerConstants.ERROR_CODES[6]);
  }
}

module.exports = {
  createSupportTicket,
  trackTicketStatus,
  escalateTicket,
  closeTicket,
};