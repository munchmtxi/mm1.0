'use strict';

const { SupportTicket, Customer, Ride, Order, Booking } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const rideConstants = require('@constants/customer/rideConstants');
const tipConstants = require('@constants/customer/tipConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('sequelize');

async function createSupportTicket(customerId, issue, transaction) {
  const { serviceType, issueType, description, rideId, orderId, bookingId, groupCustomerIds } = issue;

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);

  if (!tipConstants.TIP_SETTINGS.SERVICE_TYPES.includes(serviceType)) {
    throw new AppError('Invalid service type', 400, customerConstants.ERROR_CODES[0]);
  }

  const validIssueTypes = ['PAYMENT_ISSUE', 'SERVICE_QUALITY', 'CANCELLATION', 'DELIVERY_ISSUE', 'BOOKING_ISSUE', 'OTHER'];
  if (!validIssueTypes.includes(issueType)) {
    throw new AppError('Invalid issue type', 400, customerConstants.ERROR_CODES[0]);
  }

  if ((rideId && (orderId || bookingId)) || (orderId && bookingId) || (!rideId && !orderId && !bookingId)) {
    throw new AppError('Must provide exactly one of rideId, orderId, or bookingId', 400, customerConstants.ERROR_CODES[0]);
  }

  if (rideId) {
    const ride = await Ride.findByPk(rideId, { transaction });
    if (!ride || ride.customer_id !== customerId) throw new AppError('Ride not found', 404, rideConstants.ERROR_CODES[0]);
  } else if (orderId) {
    const order = await Order.findByPk(orderId, { transaction });
    if (!order || order.customer_id !== customerId) throw new AppError('Order not found', 404, customerConstants.ERROR_CODES[2]);
  } else if (bookingId) {
    const booking = await Booking.findByPk(bookingId, { transaction });
    if (!booking || booking.customer_id !== customerId) throw new AppError('Booking not found', 404, customerConstants.ERROR_CODES[3]);
  }

  if (groupCustomerIds && groupCustomerIds.length > 0) {
    const maxFriends = serviceType === 'ride' ? rideConstants.SHARED_RIDE_SETTINGS.MAX_FRIENDS : 3;
    if (groupCustomerIds.length > maxFriends) {
      throw new AppError('Too many group members', 400, customerConstants.ERROR_CODES[0]);
    }
    for (const groupCustomerId of groupCustomerIds) {
      const groupCustomer = await Customer.findByPk(groupCustomerId, { transaction });
      if (!groupCustomer) throw new AppError('Group member not found', 404, customerConstants.ERROR_CODES[1]);
    }
  }

  const ticket = await SupportTicket.create(
    {
      customer_id: customerId,
      ride_id: rideId || null,
      order_id: orderId || null,
      booking_id: bookingId || null,
      service_type: serviceType,
      issue_type: issueType,
      description: groupCustomerIds ? `${description} (Group: ${groupCustomerIds.join(', ')})` : description,
      status: 'OPEN',
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Support ticket created', { ticketId: ticket.id, customerId, serviceType });
  return ticket;
}

async function trackTicketStatus(ticketId, transaction) {
  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [
      { model: Customer, attributes: ['id', 'user_id'] },
      { model: Ride, attributes: ['id', 'pickup_location', 'dropoff_location'] },
      { model: Order, attributes: ['id', 'delivery_address'] },
      { model: Booking, attributes: ['id', 'restaurant_id'] },
    ],
    transaction,
  });
  if (!ticket) throw new AppError('Ticket not found', 404, customerConstants.ERROR_CODES[4]);

  const status = {
    ticketId,
    serviceType: ticket.service_type,
    issueType: ticket.issue_type,
    status: ticket.status,
    description: ticket.description,
    updatedAt: ticket.updated_at,
    ride: ticket.Ride ? { id: ticket.Ride.id, pickupLocation: ticket.Ride.pickup_location, dropoffLocation: ticket.Ride.dropoff_location } : null,
    order: ticket.Order ? { id: ticket.Order.id, deliveryAddress: ticket.Order.delivery_address } : null,
    booking: ticket.Booking ? { id: ticket.Booking.id, restaurantId: ticket.Booking.restaurant_id } : null,
  };

  logger.info('Ticket status tracked', { ticketId, status: ticket.status, serviceType: ticket.service_type });
  return status;
}

async function escalateTicket(ticketId, transaction) {
  const ticket = await SupportTicket.findByPk(ticketId, { transaction });
  if (!ticket) throw new AppError('Ticket not found', 404, customerConstants.ERROR_CODES[4]);
  if (ticket.status !== 'OPEN' && ticket.status !== 'IN_PROGRESS') {
    throw new AppError('Ticket cannot be escalated', 400, customerConstants.ERROR_CODES[5]);
  }

  await ticket.update(
    {
      status: 'ESCALATED',
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Ticket escalated', { ticketId, serviceType: ticket.service_type });
}

async function closeTicket(customerId, ticketId, transaction) {
  const ticket = await SupportTicket.findOne({
    where: { id: ticketId, customer_id: customerId },
    transaction,
  });
  if (!ticket) throw new AppError('Ticket not found', 404, customerConstants.ERROR_CODES[4]);
  if (ticket.status === 'CLOSED') {
    throw new AppError('Ticket already closed', 400, customerConstants.ERROR_CODES[5]);
  }

  await ticket.update(
    {
      status: 'CLOSED',
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Ticket closed', { ticketId, customerId });
  return ticket;
}

module.exports = {
  createSupportTicket,
  trackTicketStatus,
  escalateTicket,
  closeTicket,
};