'use strict';

const socketService = require('@services/common/socketService');
const supportEvents = require('@socket/events/customer/munch/supportEvents');
const logger = require('@utils/logger');

const handleTicketCreated = async (io, data) => {
  const { ticketId, ticketNumber, status, customerId } = data;
  await socketService.emit(io, supportEvents.TICKET_CREATED, { ticketId, ticketNumber, status, customerId }, `customer:${customerId}`);
  logger.info('Ticket created event emitted', { ticketId, customerId });
};

const handleTicketEscalated = async (io, data) => {
  const { ticketId, ticketNumber, status, customerId } = data;
  await socketService.emit(io, supportEvents.TICKET_ESCALATED, { ticketId, ticketNumber, status, customerId }, `customer:${customerId}`);
  logger.info('Ticket escalated event emitted', { ticketId, customerId });
};

module.exports = { handleTicketCreated, handleTicketEscalated };