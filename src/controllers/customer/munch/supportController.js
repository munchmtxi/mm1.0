'use strict';

const { sequelize } = require('@models');
const supportService = require('@services/customer/munch/supportService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const createSupportTicket = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const issue = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { ticket, ticketNumber } = await supportService.createSupportTicket(customerId, issue, transaction);
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'support_interaction').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCHER.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_TYPES.TYPES[4],
      messageKey: 'support.ticket.created',
      messageParams: { ticketId: ticket.id, ticketNumber },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_TYPES.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'support:ticket:created', {
      ticketId: ticket.id,
      ticketNumber,
      status: ticket.status,
      customerId
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'CREATE_SUPPORT_TICKET',
      userId: customerId,
      role: 'customer',
      details: `Created ticket_id: ${ticket.id} for order_id: ${issue.orderId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Support ticket created', { customerId, ticketId: ticket.id });
    res.status(200).json({
      status: 'success',
      data: { ticketId: ticket.id, ticketNumber, status: ticket.status }
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const trackTicketStatus = catchAsync(async (req, res) => {
  const { ticketId } = req.params;
  const { customerId } = req.user;
  const transaction = await sequelize.transaction();
  try {
    const status = await supportService.trackTicketStatus(ticketId, customerId, transaction);
    await auditService.logAction({
      action: 'TRACK_TICKET_STATUS',
      userId: customerId,
      role: 'customer',
      details: `Tracked status for ticket_id: ${ticketId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Ticket status tracked', { customerId, ticketId });
    res.status(200).json({ status: 'success', data: status });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const escalateTicket = catchAsync(async (req, res) => {
  const { ticketId } = req.body;
  const { customerId } = req.user;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await supportService.escalateTicket(ticketId, customerId, transaction);
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'support_interaction').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCHER.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_TYPES.TYPES[5],
      messageKey: 'support.ticket.escalated',
      messageParams: { ticketId, ticketNumber: result.ticketNumber },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_TYPES.DELIVERY_METHODS[0],
    }, transaction);
    await socketService.emit(io, 'support:ticket:escalated', {
      ticketId,
      ticketNumber: result.ticketNumber,
      status: result.status,
      customerId
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'ESCALATE_TICKET',
      userId: customerId,
      role: 'customer',
      details: `Escalated ticket_id: ${ticketId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Ticket escalated', { customerId, ticketId });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { createSupportTicket, trackTicketStatus, escalateTicket };