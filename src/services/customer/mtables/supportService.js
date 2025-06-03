'use strict';

const { sequelize } = require('sequelize');
const { SupportTicket, Customer, Booking, InDiningOrder, Staff } = require('@models');
const mtablesConstants = require('@constants/mtablesConstants');

async function createSupportTicket({ customerId, bookingId, orderId, issueType, description, transaction }) {
  if (!customerId || !issueType || !description) throw new Error('Missing required fields');

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error('Customer not found');

  if (!Object.values(mtablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES).includes(issueType)) {
    throw new Error('Invalid issue type');
  }

  if (description.length > mtablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH) {
    throw new Error('Description too long');
  }

  if (bookingId) {
    const booking = await Booking.findByPk(bookingId, { transaction });
    if (!booking || booking.customer_id !== customerId) throw new Error('Invalid booking');
  }

  if (orderId) {
    const order = await InDiningOrder.findByPk(orderId, { transaction });
    if (!order || order.customer_id !== customerId) throw new Error('Invalid order');
  }

  let assignedStaffId = null;
  if (issueType === mtablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES.PAYMENT_ISSUE) {
    const staff = await Staff.findOne({
      where: { availability_status: mtablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
      transaction,
    });
    assignedStaffId = staff?.id;
  }

  const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const ticket = await SupportTicket.create(
    {
      customer_id: customerId,
      booking_id: bookingId || null,
      order_id: orderId || null,
      assigned_staff_id: assignedStaffId,
      ticket_number: ticketNumber,
      issue_type: issueType,
      description,
      status: mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.OPEN,
      priority: issueType === mtablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES.PAYMENT_ISSUE ? mtablesConstants.SUPPORT_SETTINGS.PRIORITIES.HIGH : mtablesConstants.SUPPORT_SETTINGS.PRIORITIES.MEDIUM,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  return ticket;
}

async function trackTicketStatus({ ticketId, transaction }) {
  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [
      { model: Customer, as: 'customer' },
      { model: Booking, as: 'booking' },
      { model: InDiningOrder, as: 'order' },
      { model: Staff, as: 'assignedStaff' },
    ],
    transaction,
  });

  if (!ticket) throw new Error('Ticket not found');

  return ticket;
}

async function escalateTicket({ ticketId, transaction }) {
  const ticket = await SupportTicket.findByPk(ticketId, { include: [{ model: Customer, as: 'customer' }], transaction });
  if (!ticket) throw new Error('Ticket not found');

  if (ticket.status === mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.ESCALATED) {
    throw new Error('Ticket already escalated');
  }

  if (ticket.status === mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.CLOSED) {
    throw new Error('Closed ticket cannot be escalated');
  }

  const seniorStaff = await Staff.findOne({
    where: {
      availability_status: mtablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE,
      position: { [sequelize.Op.in]: ['manager', 'supervisor'] },
    },
    transaction,
  });

  await ticket.update(
    {
      status: mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.ESCALATED,
      assigned_staff_id: seniorStaff?.id || ticket.assigned_staff_id,
      priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES.HIGH,
      updated_at: new Date(),
    },
    { transaction }
  );

  return ticket;
}

module.exports = {
  createSupportTicket,
  trackTicketStatus,
  escalateTicket,
};