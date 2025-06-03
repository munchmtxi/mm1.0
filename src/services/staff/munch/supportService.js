'use strict';

/**
 * supportService.js
 * Manages support operations for munch (staff role). Handles order inquiries, issue resolution,
 * dispute escalation, and point awarding.
 * Last Updated: May 25, 2025
 */

const { SupportTicket, Order, Dispute, GamificationPoints, Staff, Feedback, DriverSupportTicket } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const merchantConstants = require('@constants/staff/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Addresses order inquiries (FOH).
 * @param {number} orderId - Order ID.
 * @param {Object} issue - Issue details { description, issue_type }.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Created support ticket.
 */
async function handleOrderInquiry(orderId, issue, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupport?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const ticketNumber = `SUP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ticket = await SupportTicket.create({
      user_id: order.customer_id,
      delivery_order_id: orderId,
      ticket_number: ticketNumber,
      service_type: 'munch',
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

    const message = localization.formatMessage('support.inquiry_created', { ticketNumber });
    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
      message,
      role: 'customer',
      module: 'munch',
      ticketId: ticket.id,
    });

    socketService.emit(`munch:support:${order.customer_id}`, 'support:inquiry_created', {
      ticketId: ticket.id,
      ticketNumber,
      status: ticket.status,
    });

    return ticket;
  } catch (error) {
    logger.error('Order inquiry handling failed', { error: error.message, orderId });
    throw new AppError(`Inquiry handling failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Manages order issue resolution.
 * @param {number} orderId - Order ID.
 * @param {string} resolution - Resolution details.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Updated support ticket.
 */
async function resolveOrderIssue(orderId, resolution, staffId, ipAddress) {
  try {
    const ticket = await SupportTicket.findOne({
      where: { delivery_order_id: orderId, status: { [Op.ne]: 'closed' } },
    });
    if (!ticket) {
      throw new AppError('Support ticket not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupport?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const encryptedResolution = await securityService.encryptData({ resolution });
    await ticket.update({
      status: 'resolved',
      resolution_details: encryptedResolution,
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { ticketId: ticket.id, action: 'resolve_issue' },
      ipAddress,
    });

    const message = localization.formatMessage('support.resolved', { ticketNumber: ticket.ticket_number });
    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
      message,
      role: 'customer',
      module: 'munch',
      ticketId: ticket.id,
    });

    socketService.emit(`munch:support:${ticket.user_id}`, 'support:resolved', {
      ticketId: ticket.id,
      status: ticket.status,
    });

    return ticket;
  } catch (error) {
    logger.error('Issue resolution failed', { error: error.message, orderId });
    throw new AppError(`Issue resolution failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

/**
 * Escalates disputes to merchants.
 * @param {number} orderId - Order ID.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Created dispute.
 */
async function escalateOrderDispute(orderId, staffId, ipAddress) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new AppError('Order not found', 404, staffConstants.STAFF_ERROR_CODES.ORDER_NOT_FOUND);
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staffRolesConstants.STAFF_PERMISSIONS[staff.position]?.manageSupport?.includes('write')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const ticket = await SupportTicket.findOne({
      where: { delivery_order_id: orderId, status: { [Op.ne]: 'closed' } },
    });
    if (!ticket) {
      throw new AppError('Support ticket not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const dispute = await Dispute.create({
      customer_id: order.customer_id,
      service_id: orderId,
      service_type: 'munch',
      issue: ticket.description,
      issue_type: ticket.issue_type,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await ticket.update({ status: 'escalated', updated_at: new Date() });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { ticketId: ticket.id, disputeId: dispute.id, action: 'escalate_dispute' },
      ipAddress,
    });

    const message = localization.formatMessage('support.escalated', { ticketNumber: ticket.ticket_number });
    await notificationService.sendNotification({
      userId: ticket.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SUPPORT,
      message,
      role: 'customer',
      module: 'munch',
      ticketId: ticket.id,
    });

    socketService.emit(`munch:support:${ticket.user_id}`, 'support:escalated', {
      ticketId: ticket.id,
      disputeId: dispute.id,
      status: ticket.status,
    });

    return dispute;
  } catch (error) {
    logger.error('Dispute escalation failed', { error: error.message, orderId });
    throw new AppError(`Dispute escalation failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
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

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.ISSUE_RESOLUTION.action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.ISSUE_RESOLUTION.points,
    });
  } catch (error) {
    logger.error('Support points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, merchantConstants.MUNCH_CONSTANTS.ERROR);
  }
}

module.exports = {
  handleOrderInquiry,
  resolveOrderIssue,
  escalateOrderDispute,
  awardSupportPoints,
};