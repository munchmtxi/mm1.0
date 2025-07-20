'use strict';

const { Driver, Ride, Order, DriverSupportTicket, sequelize } = require('@models');
const driverConstants = require('@constants/driverConstants');
const supportAdminConstants = require('@constants/admin/supportAdminConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

function generateTicketNumber() {
  return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

async function createSupportTicket(driverId, issue) {
  const { service_type, issue_type, description, ride_id, delivery_order_id } = issue;

  if (!driverConstants.SUPPORT_CONSTANTS.SERVICE_TYPES.includes(service_type)) {
    throw new AppError('Invalid service type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!supportAdminConstants.SUPPORT_OPERATIONS.ISSUE_TYPES.includes(issue_type)) {
    throw new AppError('Invalid issue type', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (!description || description.length < 10) {
    throw new AppError('Description must be at least 10 characters', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const driver = await Driver.findByPk(driverId);
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
        status: supportAdminConstants.SUPPORT_OPERATIONS.DISPUTE_STATUSES[0], // 'open'
        priority: issue_type === 'payment' ? supportAdminConstants.SUPPORT_OPERATIONS.TICKET_PRIORITIES[2] : supportAdminConstants.SUPPORT_OPERATIONS.TICKET_PRIORITIES[1], // 'high' or 'medium'
      },
      { transaction }
    );

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

async function trackTicketStatus(driverId, ticketId) {
  const driver = await Driver.findByPk(driverId);
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
}

async function getCancellationPolicies(driverId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  return driverConstants.SUPPORT_CONSTANTS.CANCELLATION_POLICIES;
}

async function escalateTicket(driverId, ticketId) {
  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const ticket = await DriverSupportTicket.findByPk(ticketId);
  if (!ticket || ticket.driver_id !== driverId) {
    throw new AppError('Ticket not found or unauthorized', 404, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (ticket.status === supportAdminConstants.SUPPORT_OPERATIONS.DISPUTE_STATUSES[3]) { // 'escalated'
    throw new AppError('Ticket is already escalated', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if ([supportAdminConstants.SUPPORT_OPERATIONS.DISPUTE_STATUSES[4], supportAdminConstants.SUPPORT_OPERATIONS.DISPUTE_STATUSES[2]].includes(ticket.status)) { // 'closed' or 'resolved'
    throw new AppError('Cannot escalate resolved or closed ticket', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }

  const transaction = await sequelize.transaction();
  try {
    await ticket.update(
      { status: supportAdminConstants.SUPPORT_OPERATIONS.DISPUTE_STATUSES[3], priority: supportAdminConstants.SUPPORT_OPERATIONS.TICKET_PRIORITIES[2] }, // 'escalated', 'high'
      { transaction }
    );

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