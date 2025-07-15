'use strict';

const { handleOrderInquiry, resolveOrderDispute, shareOrderPolicies } = require('@services/merchant/munch/supportService');
const { SupportTicket, Order, Customer, Staff, GamificationPoints } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/common/munchConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

const handleOrderInquiryController = catchAsync(async (req, res) => {
  const { orderId, issue } = req.body;
  const { ticketId, ticketNumber, orderId: processedOrderId, status } = await handleOrderInquiry(orderId, issue);

  const order = await Order.findByPk(processedOrderId, { include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }] });
  const ticket = await SupportTicket.findByPk(ticketId, { include: [{ model: Staff, as: 'assignedStaff' }] });

  await socketService.emit(null, 'support:ticket_created', { ticketId, ticketNumber, orderId, status }, `customer:${order.customer_id}`);

  await auditService.logAction({
    userId: order.customer_id,
    role: 'customer',
    action: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
    details: { orderId, ticketId, issueType: issue.type },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: order.customer_id,
    notificationType: munchConstants.NOTIFICATION_TYPES.INQUIRY_SUBMITTED,
    messageKey: 'support.inquirySubmitted',
    messageParams: { ticketNumber, orderNumber: order.order_number },
    role: 'customer',
    module: 'support',
    languageCode: order.customer?.preferred_language || 'en',
  });

  if (ticket.assignedStaff) {
    await notificationService.sendNotification({
      userId: ticket.assignedStaff.user_id,
      notificationType: munchConstants.NOTIFICATION_TYPES.TICKET_ASSIGNED,
      messageKey: 'support.ticketAssigned',
      messageParams: { ticketNumber, orderNumber: order.order_number },
      role: 'staff',
      module: 'support',
      languageCode: ticket.assignedStaff.user?.preferred_language || 'en',
    });
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'support.inquirySubmitted', { ticketNumber, orderNumber: order.order_number }),
    data: { ticketId, ticketNumber, orderId, status },
  });
});

const resolveOrderDisputeController = catchAsync(async (req, res) => {
  const { orderId, resolution } = req.body;
  const { ticketId, orderId: resolvedOrderId, status, resolutionAction } = await resolveOrderDispute(orderId, resolution);

  const ticket = await SupportTicket.findByPk(ticketId, {
    include: [{ model: Order, as: 'deliveryOrder', include: [{ model: Customer, as: 'customer' }] }],
  });

  await socketService.emit(null, 'support:dispute_resolved', { ticketId, orderId, status, resolutionAction }, `customer:${ticket.customer_id}`);

  await auditService.logAction({
    userId: 'system',
    role: 'merchant',
    action: munchConstants.AUDIT_TYPES.RESOLVE_ORDER_DISPUTE,
    details: { orderId, ticketId, resolutionAction },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: ticket.customer_id,
    notificationType: munchConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
    messageKey: 'support.disputeResolved',
    messageParams: { ticketNumber: ticket.ticket_number, resolution: resolutionAction },
    role: 'customer',
    module: 'support',
    languageCode: ticket.deliveryOrder.customer?.preferred_language || 'en',
  });

  // Award points for support interaction
  const recentTickets = await SupportTicket.count({
    where: {
      customer_id: ticket.customer_id,
      status: munchConstants.SUPPORT_CONSTANTS.TICKET_STATUSES[3],
      updated_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (recentTickets > 0) {
    await pointService.awardPoints({
      userId: ticket.customer_id,
      role: 'customer',
      action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'support_interaction').action,
      languageCode: ticket.deliveryOrder.customer?.preferred_language || 'en',
    });
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'support.disputeResolved', { ticketNumber: ticket.ticket_number, resolution: resolutionAction }),
    data: { ticketId, orderId, status, resolutionAction },
  });
});

const shareOrderPoliciesController = catchAsync(async (req, res) => {
  const { orderId } = req.body;
  const { orderId: sharedOrderId, customerId } = await shareOrderPolicies(orderId);

  const order = await Order.findByPk(sharedOrderId, { include: [{ model: Customer, as: 'customer' }] });

  await socketService.emit(null, 'support:policies_shared', { orderId }, `customer:${customerId}`);

  await auditService.logAction({
    userId: customerId,
    role: 'customer',
    action: munchConstants.AUDIT_TYPES.SHARE_ORDER_POLICIES,
    details: { orderId },
    ipAddress: req.ip || '0.0.0.0',
  });

  const notificationResult = await notificationService.sendNotification({
    userId: customerId,
    notificationType: munchConstants.NOTIFICATION_TYPES.ORDER_POLICIES,
    messageKey: 'support.orderPolicies',
    messageParams: { orderNumber: order.order_number },
    role: 'customer',
    module: 'support',
    languageCode: order.customer?.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'munch', 'en', 'support.orderPolicies', { orderNumber: order.order_number }),
    data: notificationResult,
  });
});

module.exports = {
  handleOrderInquiryController,
  resolveOrderDisputeController,
  shareOrderPoliciesController,
};