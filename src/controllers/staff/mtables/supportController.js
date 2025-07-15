// supportController.js
// Handles support-related requests for mtables staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const supportService = require('@services/staff/mtables/supportService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const { Booking, Staff, Customer } = require('@models');

async function handleSupportRequest(req, res, next) {
  try {
    const { bookingId, issue, staffId } = req.body;
    const io = req.app.get('io');

    const ticket = await supportService.handleSupportRequest(bookingId, issue, staffId);

    const booking = await Booking.findByPk(bookingId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_retrieve,
      details: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, issueType: issue.issue_type },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.supportRequestHandled.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.supportRequestHandled.points,
      details: { ticketId: ticket.id, bookingId },
    });

    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST,
      messageKey: 'mtables.support_request_created',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(booking.customer_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:support:request_created`, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      status: ticket.status,
    }, `customer:${booking.customer_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.support_request_created', { ticketNumber: ticket.ticket_number }, (await Customer.findByPk(booking.customer_id)).preferred_language || 'en'),
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function escalateIssue(req, res, next) {
  try {
    const { bookingId, staffId } = req.body;
    const io = req.app.get('io');

    const ticket = await supportService.escalateIssue(bookingId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { ticketId: ticket.id, action: 'escalate' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.issueEscalated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.issueEscalated.points,
      details: { ticketId: ticket.id, bookingId },
    });

    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST,
      messageKey: 'mtables.support_escalated',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(ticket.user_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:support:escalated`, {
      ticketId: ticket.id,
      status: ticket.status,
    }, `customer:${ticket.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.support_escalated', { ticketNumber: ticket.ticket_number }, (await Customer.findByPk(ticket.user_id)).preferred_language || 'en'),
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function logSupportResolution(req, res, next) {
  try {
    const { bookingId, resolutionDetails, staffId } = req.body;
    const io = req.app.get('io');

    const ticket = await supportService.logSupportResolution(bookingId, resolutionDetails, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { ticketId: ticket.id, action: 'resolve' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.issueResolved.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.issueResolved.points,
      details: { ticketId: ticket.id, bookingId },
    });

    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.SUPPORT_REQUEST,
      messageKey: 'mtables.support_resolved',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'mtables',
      languageCode: (await Customer.findByPk(ticket.user_id)).preferred_language || 'en',
    });

    socketService.emit(io, `staff:mtables:support:resolved`, {
      ticketId: ticket.id,
      status: ticket.status,
    }, `customer:${ticket.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('mtables.support_resolved', { ticketNumber: ticket.ticket_number }, (await Customer.findByPk(ticket.user_id)).preferred_language || 'en'),
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleSupportRequest,
  escalateIssue,
  logSupportResolution,
};