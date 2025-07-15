// supportController.js
// Handles support-related requests for munch staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const supportService = require('@services/staff/munch/supportService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff, Customer } = require('@models');

async function handleOrderInquiry(req, res, next) {
  try {
    const { orderId, issue, staffId } = req.body;
    const io = req.app.get('io');

    const ticket = await supportService.handleOrderInquiry(orderId, issue, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_TICKET,
      details: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, issueType: issue.issue_type },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.inquiryHandled.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.inquiryHandled.points,
      details: { ticketId: ticket.id },
    });

    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.SUPPORT_TICKET,
      messageKey: 'munch.inquiry_created',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(ticket.user_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:support:inquiry_created`, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      status: ticket.status,
    }, `customer:${ticket.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.inquiry_created', { ticketNumber: ticket.ticket_number }, (await Customer.findByPk(ticket.user_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function resolveOrderIssue(req, res, next) {
  try {
    const { orderId, resolution, staffId } = req.body;
    const io = req.app.get('io');

    const ticket = await supportService.resolveOrderIssue(orderId, resolution, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_TICKET,
      details: { ticketId: ticket.id, action: 'resolve_issue' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.issueResolved.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.issueResolved.points,
      details: { ticketId: ticket.id },
    });

    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.SUPPORT_TICKET,
      messageKey: 'munch.issue_resolved',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(ticket.user_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:support:resolved`, {
      ticketId: ticket.id,
      status: ticket.status,
    }, `customer:${ticket.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.issue_resolved', { ticketNumber: ticket.ticket_number }, (await Customer.findByPk(ticket.user_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
}

async function escalateOrderDispute(req, res, next) {
  try {
    const { orderId, staffId } = req.body;
    const io = req.app.get('io');

    const { dispute, ticket } = await supportService.escalateOrderDispute(orderId, staffId);

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: munchConstants.AUDIT_TYPES.PROCESS_TICKET,
      details: { ticketId: ticket.id, disputeId: dispute.id, action: 'escalate_dispute' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.disputeEscalated.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.disputeEscalated.points,
      details: { ticketId: ticket.id, disputeId: dispute.id },
    });

    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.SUPPORT_TICKET,
      messageKey: 'munch.dispute_escalated',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'munch',
      languageCode: (await Customer.findByPk(ticket.user_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, `staff:munch:support:escalated`, {
      ticketId: ticket.id,
      disputeId: dispute.id,
      status: ticket.status,
    }, `customer:${ticket.user_id}`);

    res.status(200).json({
      success: true,
      message: formatMessage('munch.dispute_escalated', { ticketNumber: ticket.ticket_number }, (await Customer.findByPk(ticket.user_id)).preferred_language || munchConstants.LOCALIZATION_CONSTANTS.DEFAULT_LANGUAGE),
      data: dispute,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  handleOrderInquiry,
  resolveOrderIssue,
  escalateOrderDispute,
};