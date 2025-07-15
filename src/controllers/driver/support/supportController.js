'use strict';

const supportService = require('@services/driver/support/supportService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function createSupportTicket(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const issue = req.body;
    const ticket = await supportService.createSupportTicket(driverId, issue, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: ticket,
      message: formatMessage(
        'driver',
        'support',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'support.ticket_created',
        { ticket_number: ticket.ticket_number }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function trackTicketStatus(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const ticketId = parseInt(req.params.ticketId, 10);
    const ticket = await supportService.trackTicketStatus(driverId, ticketId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function getCancellationPolicies(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const policies = await supportService.getCancellationPolicies(driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: policies,
    });
  } catch (error) {
    next(error);
  }
}

async function escalateTicket(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const ticketId = parseInt(req.params.ticketId, 10);
    const ticket = await supportService.escalateTicket(driverId, ticketId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: ticket,
      message: formatMessage(
        'driver',
        'support',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'support.ticket_escalated',
        { ticket_number: ticket.ticket_number }
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSupportTicket,
  trackTicketStatus,
  getCancellationPolicies,
  escalateTicket,
};