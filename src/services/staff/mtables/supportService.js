'use strict';

/**
 * supportService.js
 * Manages support operations for mtables (staff role). Handles FOH support inquiries, issue escalation,
 * resolution logging, and point awarding.
 * Last Updated: May 25, 2025
 */

const { SupportTicket, Booking, AuditLogSupport, GamificationPoints, Staff, Dispute, Feedback } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Processes support inquiries (FOH).
 * @param {number} bookingId - Booking ID.
 * @param {Object} issue - Issue details { description, issue_type }.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Created support ticket.
 */
async function handleSupportRequest(bookingId, issue, staffId, ipAddress) {
  try {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupport?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const ticketNumber = `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ticket = await SupportTicket.create({
      user_id: booking.customer_id,
      booking_id: bookingId,
      ticket_number: ticketNumber,
      service_type: 'mtables',
      issue_type: issue.issue_type,
      description: issue.description,
      status: 'open',
      priority: 'medium',
      assigned_role_id: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { ticketId: ticket.id, ticketNumber, issueType: issue.issue_type },
      ipAddress,
    });

    const message = localization.formatMessage('support.request_created', { ticketNumber });
    await notificationService.sendNotification({
      userId: booking.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      ticketId: ticket.id,
    });

    socketService.emit(`mtables:support:${booking.customer_id}`, 'support:request_created', {
      ticketId: ticket.id,
      ticketNumber,
      status: ticket.status,
    });

    return ticket;
  } catch (error) {
    logger.error('Support request handling failed', { error: error.message, bookingId });
    throw new AppError(`Support request failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Escalates unresolved issues.
 * @param {number} bookingId - Booking ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated support ticket.
 */
async function escalateIssue(bookingId, staffId, ipAddress) {
  try {
    const ticket = await SupportTicket.findOne({ where: { booking_id: bookingId, status: { [Op.ne]: 'closed' } } });
    if (!ticket) {
      throw new AppError('Support ticket not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupport?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    await ticket.update({ status: 'escalated', updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { ticketId: ticket.id, action: 'escalate' },
      ipAddress,
    });

    const message = localization.formatMessage('support.escalated', { ticketNumber: ticket.ticket_number });
    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      ticketId: ticket.id,
    });

    socketService.emit(`mtables:support:${ticket.user_id}`, 'support:escalated', {
      ticketId: ticket.id,
      status: ticket.status,
    });

    return ticket;
  } catch (error) {
    logger.error('Issue escalation failed', { error: error.message, bookingId });
    throw new AppError(`Issue escalation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Records support issue resolutions.
 * @param {number} bookingId - Booking ID.
 * @param {string} resolutionDetails - Resolution details.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated support ticket.
 */
async function logSupportResolution(bookingId, resolutionDetails, staffId, ipAddress) {
  try {
    const ticket = await SupportTicket.findOne({ where: { booking_id: bookingId, status: { [Op.ne]: 'closed' } } });
    if (!ticket) {
      throw new AppError('Support ticket not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupport?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const encryptedDetails = await securityService.encryptData({ resolutionDetails });
    await ticket.update({
      status: 'resolved',
      resolution_details: encryptedDetails,
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { ticketId: ticket.id, action: 'resolve' },
      ipAddress,
    });

    const message = localization.formatMessage('support.resolved', { ticketNumber: ticket.ticket_number });
    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message,
      role: 'customer',
      module: 'mtables',
      ticketId: ticket.id,
    });

    socketService.emit(`mtables:support:${ticket.user_id}`, 'support:resolved', {
      ticketId: ticket.id,
      status: ticket.status,
    });

    return ticket;
  } catch (error) {
    logger.error('Support resolution logging failed', { error: error.message, bookingId });
    throw new AppError(`Resolution logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

/**
 * Awards points for support resolution.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardSupportPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.ISSUE_RESOLUTION.action,
      languageCode: 'en',
    });

    socketService.emit(`mtables:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.ISSUE_RESOLUTION.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.ISSUE_RESOLUTION.points,
    });
  } catch (error) {
    logger.error('Support points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

module.exports = {
  handleSupportRequest,
  escalateIssue,
  logSupportResolution,
  awardSupportPoints,
};