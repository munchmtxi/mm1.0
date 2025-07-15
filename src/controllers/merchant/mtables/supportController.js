'use strict';

const { handleInquiry, resolveDispute, communicatePolicies } = require('@services/merchant/mtables/supportService');
const { Customer, Staff, SupportTicket } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const mTablesConstants = require('@constants/common/mTablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const handleInquiryController = catchAsync(async (req, res) => {
  const { bookingId, customerId, orderId, issueType, description, staffId } = req.body;
  const { ipAddress } = req;
  const ticket = await handleInquiry(bookingId, { customerId, orderId, issueType, description, staffId, ipAddress });

  const customer = await Customer.findByPk(customerId);

  await notificationService.sendNotification({
    userId: customer.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED,
    messageKey: 'support.ticket.created',
    messageParams: { ticketNumber: ticket.ticket_number },
    role: 'customer',
    module: 'mtables',
    ticketId: ticket.id,
  });

  if (staffId) {
    const staff = await Staff.findByPk(staffId);
    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED,
      messageKey: 'support.ticket.assigned',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'merchant',
      module: 'mtables',
      ticketId: ticket.id,
    });
  }

  await socketService.emit(null, 'support:ticket_created', {
    userId: customer.user_id,
    role: 'customer',
    ticketId: ticket.id,
    ticketNumber: ticket.ticket_number,
  });

  await auditService.logAction({
    userId: staffId ? (await Staff.findByPk(staffId)).user_id : customer.user_id,
    role: staffId ? 'merchant' : 'customer',
    action: mTablesConstants.AUDIT_TYPES.SUPPORT_TICKET_CREATED,
    details: { ticketId: ticket.id, issueType, bookingId, orderId },
    ipAddress: ipAddress || 'unknown',
  });

  await pointService.awardPoints({
    userId: customer.user_id,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'support_interaction').action,
    languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'support.ticket.created', { ticketNumber: ticket.ticket_number }),
    data: ticket,
  });
});

const resolveDisputeController = catchAsync(async (req, res) => {
  const { bookingId, ticketId, staffId, resolutionDetails } = req.body;
  const { ipAddress } = req;
  const ticket = await resolveDispute(bookingId, { ticketId, staffId, resolutionDetails, ipAddress });

  const customer = await Customer.findByPk(ticket.customer_id);

  await notificationService.sendNotification({
    userId: customer.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_RESOLVED,
    messageKey: 'support.ticket.resolved',
    messageParams: { ticketNumber: ticket.ticket_number },
    role: 'customer',
    module: 'mtables',
    ticketId: ticket.id,
  });

  await socketService.emit(null, 'support:ticket_resolved', {
    userId: customer.user_id,
    role: 'customer',
    ticketId: ticket.id,
    status: ticket.status,
  });

  await auditService.logAction({
    userId: (await Staff.findByPk(staffId)).user_id,
    role: 'merchant',
    action: mTablesConstants.AUDIT_TYPES.SUPPORT_TICKET_RESOLVED,
    details: { ticketId: ticket.id, bookingId, resolutionDetails },
    ipAddress: ipAddress || 'unknown',
  });

  await pointService.awardPoints({
    userId: customer.user_id,
    role: 'customer',
    action: gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'ticket_closure').action,
    languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'support.ticket.resolved', { ticketNumber: ticket.ticket_number }),
    data: ticket,
  });
});

const communicatePoliciesController = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const policies = await communicatePolicies(bookingId);

  const booking = await Booking.findByPk(bookingId, { include: [{ model: Customer, as: 'customer' }] });

  await notificationService.sendNotification({
    userId: booking.customer.user_id,
    notificationType: mTablesConstants.NOTIFICATION_TYPES.POLICY_COMMUNICATION,
    messageKey: 'support.policies.communicated',
    messageParams: {
      bookingId,
      refundPolicy: policies.refund,
      cancellationPolicy: policies.cancellation,
    },
    role: 'customer',
    module: 'mtables',
    bookingId,
  });

  await socketService.emit(null, 'support:policies_communicated', {
    userId: booking.customer.user_id,
    role: 'customer',
    bookingId,
  });

  await auditService.logAction({
    userId: booking.customer.user_id,
    role: 'customer',
    action: mTablesConstants.AUDIT_TYPES.POLICY_COMMUNICATED,
    details: { bookingId, policies },
    ipAddress: 'unknown',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'mtables', 'en', 'support.policies.communicated', { bookingId }),
    data: policies,
  });
});

module.exports = { handleInquiryController, resolveDisputeController, communicatePoliciesController };