'use strict';

/**
 * supportService.js
 * Manages order inquiries, disputes, policy communication, and support gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { SupportTicket, Order, Customer, MerchantBranch, Notification, AuditLog, Staff, GamificationPoints } = require('@models');

/**
 * Addresses order inquiries.
 * @param {number} orderId - Order ID.
 * @param {Object} issue - Issue details (type, description).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Created support ticket.
 */
async function handleOrderInquiry(orderId, issue, io) {
  try {
    if (!orderId || !issue?.type || !issue?.description) throw new Error('Order ID, issue type, and description required');

    const order = await Order.findByPk(orderId, { include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] });
    if (!order) throw new Error('Order not found');

    const validIssueTypes = ['PAYMENT_ISSUE', 'SERVICE_QUALITY', 'CANCELLATION', 'DELIVERY_ISSUE', 'ORDER_ISSUE', 'OTHER'];
    if (!validIssueTypes.includes(issue.type)) throw new Error('Invalid issue type');

    const ticketNumber = `TICKET-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const ticket = await SupportTicket.create({
      customer_id: order.customer_id,
      delivery_order_id: orderId,
      service_type: 'munch',
      issue_type: issue.type,
      description: issue.description,
      ticket_number: ticketNumber,
      status: 'open',
      priority: issue.priority || 'medium',
    });

    const staff = await Staff.findOne({
      where: { branch_id: order.branch_id, position: 'manager', availability_status: 'available' },
    });

    if (staff) {
      await ticket.update({ assigned_staff_id: staff.id });
    }

    await auditService.logAction({
      userId: order.customer_id,
      role: 'customer',
      action: 'handle_order_inquiry',
      details: { orderId, ticketId: ticket.id, issueType: issue.type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'support:ticketCreated', {
      ticketId: ticket.id,
      ticketNumber,
      orderId,
      status: 'open',
    }, `customer:${order.customer_id}`);

    await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: 'inquiry_submitted',
      messageKey: 'support.inquiry_submitted',
      messageParams: { ticketNumber, orderNumber: order.order_number },
      role: 'customer',
      module: 'support',
      languageCode: order.customer?.preferred_language || 'en',
    });

    if (staff) {
      await notificationService.sendNotification({
        userId: staff.user_id,
        notificationType: 'ticket_assigned',
        messageKey: 'support.ticket_assigned',
        messageParams: { ticketNumber, orderNumber: order.order_number },
        role: 'staff',
        module: 'support',
        languageCode: staff.user?.preferred_language || 'en',
      });
    }

    return ticket;
  } catch (error) {
    logger.error('Error handling order inquiry', { error: error.message });
    throw error;
  }
}

/**
 * Manages order disputes.
 * @param {number} orderId - Order ID.
 * @param {Object} resolution - Resolution details (action, details).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Resolved support ticket.
 */
async function resolveOrderDispute(orderId, resolution, io) {
  try {
    if (!orderId || !resolution?.action || !resolution?.details) throw new Error('Order ID, action, and details required');

    const ticket = await SupportTicket.findOne({
      where: { delivery_order_id: orderId, status: { [Op.in]: ['open', 'in_progress', 'escalated'] } },
      include: [{ model: Order, as: 'deliveryOrder', include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] }],
    });
    if (!ticket || !ticket.deliveryOrder) throw new Error('Ticket or order not found');

    const validActions = ['refund', 'replacement', 'discount', 'no_action'];
    if (!validActions.includes(resolution.action)) throw new Error('Invalid resolution action');

    await ticket.update({
      status: 'resolved',
      resolution_details: resolution.details,
    });

    await auditService.logAction({
      userId: 'system',
      role: 'merchant',
      action: 'resolve_order_dispute',
      details: { orderId, ticketId: ticket.id, resolutionAction: resolution.action },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'support:disputeResolved', {
      ticketId: ticket.id,
      orderId,
      status: 'resolved',
      resolutionAction: resolution.action,
    }, `customer:${ticket.customer_id}`);

    await notificationService.sendNotification({
      userId: ticket.customer_id,
      notificationType: 'dispute_resolved',
      messageKey: 'support.dispute_resolved',
      messageParams: { ticketNumber: ticket.ticket_number, resolution: resolution.action },
      role: 'customer',
      module: 'support',
      languageCode: ticket.deliveryOrder.customer?.preferred_language || 'en',
    });

    return ticket;
  } catch (error) {
    logger.error('Error resolving order dispute', { error: error.message });
    throw error;
  }
}

/**
 * Communicates refund and order policies.
 * @param {number} orderId - Order ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Policy communication result.
 */
async function shareOrderPolicies(orderId, io) {
  try {
    if (!orderId) throw new Error('Order ID required');

    const order = await Order.findByPk(orderId, { include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] });
    if (!order) throw new Error('Order not found');

    const notificationResult = await notificationService.sendNotification({
      userId: order.customer_id,
      notificationType: 'order_policies',
      messageKey: 'support.order_policies',
      messageParams: { orderNumber: order.order_number },
      role: 'customer',
      module: 'support',
      languageCode: order.customer?.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: order.customer_id,
      role: 'customer',
      action: 'share_order_policies',
      details: { orderId },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'support:policiesShared', { orderId }, `customer:${order.customer_id}`);

    return notificationResult;
  } catch (error) {
    logger.error('Error sharing order policies', { error: error.message });
    throw error;
  }
}

/**
 * Awards support-related points to customers.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points record.
 */
async function trackSupportGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const recentTickets = await SupportTicket.count({
      where: {
        customer_id: customerId,
        status: 'resolved',
        updated_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (recentTickets === 0) throw new Error('No recent resolved tickets');

    const pointsRecord = await pointService.awardPoints({
      userId: customerId,
      role: 'customer',
      action: 'support_interaction',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'track_support_gamification',
      details: { customerId, points: pointsRecord.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'gamification:pointsAwarded', {
      customerId,
      points: pointsRecord.points,
      action: 'support_interaction',
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: 'support_points_earned',
      messageKey: 'support.points_earned',
      messageParams: { points: pointsRecord.points },
      role: 'customer',
      module: 'support',
      languageCode: customer.preferred_language || 'en',
    });

    return pointsRecord;
  } catch (error) {
    logger.error('Error tracking support gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  handleOrderInquiry,
  resolveOrderDispute,
  shareOrderPolicies,
  trackSupportGamification,
};