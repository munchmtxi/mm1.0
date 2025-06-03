'use strict';

const { Op } = require('sequelize');
const { SupportTicket, Customer, Order } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function createSupportTicket(customerId, issue, transaction) {
  const { orderId, issueType, description } = issue;

  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.customer'),
      404,
      munchConstants.ERROR_TYPES.CUSTOMER_NOT_FOUND
    );
  }

  if (!Object.values(munchConstants.SUPPORT_TYPES.ISSUE_TYPES).includes(issueType)) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.idiom || munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.issue_type'),
      400,
      munchConstants.ERROR_TYPES.INVALID_ISSUE
    );
  }

  const order = await Order.findByPk(orderId, { transaction });
  if (!order || order.customer_id !== customer.id) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.idiom || munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.order'),
      404,
      munchConstants.ERROR_TYPES.ORDER_NOT_FOUND
    );
  }

  const ticketNumber = `TKT-${Date.now()}`;
  const ticket = await SupportTicket.create({
    customer_id: customer.id,
    order_id: orderId,
    service_type: 'munch',
    issue_type: issueType,
    description,
    ticket_number: ticketNumber,
    status: munchConstants.SUPPORT_TYPES.STATUSES[1],
    priority: munchConstants.SUPPORT_TYPES.PRIORITIES[1],
  }, { transaction });

  logger.info('Ticket created', { customerId, ticketId: ticket.id });
  return { ticket, ticketNumber };
}

async function getTicketStatus(ticketId, customerId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.customer'),
      404,
      munchConstants.ERROR_TYPES.CUSTOMER_NOT_FOUND
    );
  }

  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [{ model: Order, as: 'order', attributes: ['id', 'order_number'] }],
    transaction,
  });
  if (!ticket || ticket.customer_id !== customer.id || ticket.service_type !== 'munch') {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.idiom || munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.ticket'),
      404,
      munchConstants.ERROR_TYPES.TICKET_NOT_FOUND
    );
  }

  logger.info('Ticket status retrieved', { ticketId, customerId });
  return {
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    priority: ticket.priority,
    issue_type: ticket.issue_type,
    order_id: ticket.order_id,
    order_number: ticket.order?.order_number,
    resolution_details: ticket.resolution,
    created_at: ticket.created_at,
  };
}

async function escalateTicket(ticketId, customerId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: customerId },
    include: [{ model: User, as: 'user' }],
    transaction,
  });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.customer'),
      404,
      munchConstants.ERROR_TYPES.CUSTOMER_NOT_FOUND
    );
  }

  const ticket = await SupportTicket.findByPk(ticketId, { transaction });
  if (!ticket || ticket.customer_id !== customer.id || ticket.service_type !== 'munch') {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.idiom || munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.ticket'),
      404,
      munchConstants.ERROR_TYPES.TICKET_NOT_FOUND
    );
  }

  if (ticket.status === munchConstants.SUPPORT_TYPES.STATUSES[3]) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.idiom || munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.ticket_escalated'),
      400,
      munchConstants.ERROR_TYPES.TICKET_ALREADY_ESCALATED
    );
  }

  if ([munchConstants.SUPPORT_TYPES.STATUSES[4], munchConstants.SUPPORT_TYPES.STATUSES[5]].includes(ticket.status)) {
    throw new AppError(
      formatMessage('customer', 'munch', customer.user.idiom || munchConstants.MUNCHER.DEFAULT_LANGUAGE, 'invalid.ticket_cannot_escalate'),
      400,
      munchConstants.ERROR_TYPES.CANNOT_ESCALATE_TICKET
    );
  }

  await ticket.update({
    status: munchConstants.SUPPORT_TYPES.STATUSES[3],
    priority: munchConstants.SUPPORT_TYPES.PRIORITIES[2],
  }, { transaction });

  logger.info('Ticket escalated', { customerId, ticketId });
  return { ticketId: ticket.id, ticketNumber: ticket.ticket_number, status: ticket.status };
}

module.exports = { createSupportTicket, getTicketStatus, escalateTicket };