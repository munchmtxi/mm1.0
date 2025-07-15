'use strict';

const { Driver, User, DriverSupportTicket, Ride, Order, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

function generateTicketNumber() {
  return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

async function createSupportTicket(driverId, issue, auditService, notificationService, socketService, pointService) {
  const { service_type, issue_type, description, ride_id, delivery_order_id } = issue;

  if (!driverConstants.SUPPORT_CONSTANTS.SERVICE_TYPES.includes(service_type)) {
    throw new AppError('Invalid service type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!driverConstants.SUPPORT_CONSTANTS.ISSUE_TYPES.includes(issue_type)) {
    throw new AppError('Invalid issue type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!description || description.length < 10) {
    throw new AppError('Description must be at least 10 characters', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    if (ride_id && service_type === 'mtxi') {
      const ride = await Ride.findByPk(ride_id, { transaction });
      if (!ride || ride.driverId !== driverId) {
        throw new AppError('Invalid or unauthorized ride', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
      }
    } else if (delivery_order_id && service_type === 'munch') {
      const order = await Order.findByPk(delivery_order_id, { transaction });
      if (!order || order.driver_id !== driverId) {
        throw new AppError('Invalid or unauthorized delivery order', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
      }
    } else if (ride_id || delivery_order_id) {
      throw new AppError('Service type does not match reference', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
    }

    const ticket = await DriverSupportTicket.create(
      {
        driver_id: driverId,
        ride_id: service_type === 'mtxi' ? ride_id : null,
        delivery_order_id: service_type === 'munch' ? delivery_order_id : null,
        ticket_number: generateTicketNumber(),
        service_type,
        issue_type,
        description,
        status: 'open',
        priority: issue_type === 'PAYMENT_ISSUE' ? 'high' : 'medium',
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'CREATE_SUPPORT_TICKET',
        details: { driverId, ticketId: ticket.id, ticket_number: ticket.ticket_number },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT_TICKET,
        message: formatMessage(
          'driver',
          'support',
          driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'support.ticket_created',
          { ticket_number: ticket.ticket_number }
        ),
        priority: 'MEDIUM',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'support_ticket_create').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'support:ticket_created', {
      driverId,
      ticketId: ticket.id,
      ticket_number: ticket.ticket_number,
    });

    await transaction.commit();
    logger.info('Support ticket created', { driverId, ticketId: ticket.id });
    return {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      service_type,
      issue_type,
      status: ticket.status,
      priority: ticket.priority,
      created_at: ticket.created_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Create support ticket failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function trackTicketStatus(driverId, ticketId, auditService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const ticket = await DriverSupportTicket.findByPk(ticketId, {
    include: [
      { model: Ride, as: 'ride', attributes: ['id', 'status'] },
      { model: Order, as: 'deliveryOrder', attributes: ['id', 'status'] },
    ],
  });
  if (!ticket || ticket.driver_id !== driverId) {
    throw new AppError('Ticket not found or unauthorized', 404, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'TRACK_TICKET_STATUS',
        details: { driverId, ticketId, ticket_number: ticket.ticket_number },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'support_ticket_track').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'support:ticket_status', {
      driverId,
      ticketId,
      status: ticket.status,
    });

    await transaction.commit();
    logger.info('Ticket status tracked', { driverId, ticketId });
    return {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      service_type: ticket.service_type,
      issue_type: ticket.issue_type,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      resolution_details: ticket.resolution_details,
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
      ride_id: ticket.ride_id,
      delivery_order_id: ticket.delivery_order_id,
      assigned_staff_id: ticket.assigned_staff_id,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Track ticket status failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function getCancellationPolicies(driverId, auditService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const policies = driverConstants.SUPPORT_CONSTANTS.CANCELLATION_POLICIES;

  const transaction = await sequelize.transaction();
  try {
    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'GET_CANCELLATION_POLICIES',
        details: { driverId },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'support_policy_access').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'support:cancellation_policies', { driverId, policies });

    await transaction.commit();
    logger.info('Cancellation policies retrieved', { driverId });
    return policies;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Get cancellation policies failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

async function escalateTicket(driverId, ticketId, auditService, notificationService, socketService, pointService) {
  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const ticket = await DriverSupportTicket.findByPk(ticketId);
  if (!ticket || ticket.driver_id !== driverId) {
    throw new AppError('Ticket not found or unauthorized', 404, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (ticket.status === 'escalated') {
    throw new AppError('Ticket is already escalated', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (['resolved', 'closed'].includes(ticket.status)) {
    throw new AppError('Cannot escalate resolved or closed ticket', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await ticket.update({ status: 'escalated', priority: 'high' }, { transaction });

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: 'ESCALATE_TICKET',
        details: { driverId, ticketId, ticket_number: ticket.ticket_number },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT_TICKET,
        message: formatMessage(
          'driver',
          'support',
          driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'support.ticket_escalated',
          { ticket_number: ticket.ticket_number }
        ),
        priority: 'HIGH',
      },
      { transaction }
    );

    await pointService.awardPoints({
      userId: driver.user_id,
      role: 'driver',
      action: driverConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'support_ticket_escalate').action,
      languageCode: driver.user.preferred_language || driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emitToUser(driver.user_id, 'support:ticket_escalated', {
      driverId,
      ticketId,
      ticket_number: ticket.ticket_number,
    });

    await transaction.commit();
    logger.info('Ticket escalated', { driverId, ticketId });
    return {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      priority: ticket.priority,
      updated_at: ticket.updated_at,
    };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Escalate ticket failed: ${error.message}`, 500, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
}

module.exports = {
  createSupportTicket,
  trackTicketStatus,
  getCancellationPolicies,
  escalateTicket,
};