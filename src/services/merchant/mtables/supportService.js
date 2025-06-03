'use strict';

/**
 * Support Service (Merchant Side)
 * Manages merchant-side support operations, including handling inquiries, resolving disputes,
 * communicating policies, and awarding gamification points. Integrates with SupportTicket,
 * Customer, Booking, InDiningOrder, Staff, User, and GamificationPoints models, and uses
 * notification, audit, socket, and point services.
 *
 * Last Updated: May 21, 2025
 */

const { SupportTicket, Customer, Booking, InDiningOrder, Staff, User, GamificationPoints } = require('@models');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const mTablesConstants = require('@constants/mTablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/gamificationConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

class SupportService {
  /**
   * Handles customer or staff inquiries by creating or updating a support ticket
   * @param {number} bookingId - Booking ID
   * @param {Object} issue - Issue details { customerId, orderId, issueType, description, staffId, ipAddress }
   * @returns {Promise<Object>} Ticket record
   */
  static async handleInquiry(bookingId, issue) {
    const { customerId, orderId, issueType, description, staffId, ipAddress } = issue;

    if (!bookingId || !customerId || !issueType || !description) {
      throw new AppError('Missing required fields', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
    }

    if (!Object.values(mTablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES).includes(issueType)) {
      throw new AppError('Invalid issue type', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    if (description.length > mTablesConstants.SUPPORT_SETTINGS.MAX_TICKET_DESCRIPTION_LENGTH) {
      throw new AppError('Description too long', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    const booking = await Booking.findByPk(bookingId);
    if (!booking || booking.customer_id !== customerId) {
      throw new AppError('Invalid booking', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
    }

    if (orderId) {
      const order = await InDiningOrder.findByPk(orderId);
      if (!order || order.customer_id !== customerId) {
        throw new AppError('Invalid order', 400, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      }
    }

    const staff = staffId ? await Staff.findOne({
      where: { id: staffId, availability_status: mTablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
    }) : null;
    if (staffId && !staff) {
      throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const ticket = await SupportTicket.create({
      customer_id: customerId,
      booking_id: bookingId,
      in_dining_order_id: orderId || null,
      assigned_staff_id: staff?.id,
      ticket_number: ticketNumber,
      service_type: 'mtables',
      issue_type: issueType,
      description,
      status: mTablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.OPEN,
      priority: issueType === mTablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES.PAYMENT_ISSUE
        ? mTablesConstants.SUPPORT_SETTINGS.PRIORITIES.HIGH
        : mTablesConstants.SUPPORT_SETTINGS.PRIORITIES.MEDIUM,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staff?.user_id || customer.user_id,
      role: staff ? 'merchant' : 'customer',
      action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUPPORT_TICKET_CREATED,
      details: { ticketId: ticket.id, issueType, bookingId, orderId },
      ipAddress: ipAddress || 'unknown',
    });

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED,
      messageKey: 'support.ticket.created',
      messageParams: { ticketNumber },
      role: 'customer',
      module: 'mtables',
      ticketId: ticket.id,
    });

    if (staff) {
      await notificationService.sendNotification({
        userId: staff.user_id,
        notificationType: mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED,
        messageKey: 'support.ticket.assigned',
        messageParams: { ticketNumber },
        role: 'merchant',
        module: 'mtables',
        ticketId: ticket.id,
      });
    }

    await socketService.emit(null, 'support:ticket_created', {
      userId: customer.user_id,
      role: 'customer',
      ticketId: ticket.id,
      ticketNumber,
    });

    logger.info('Inquiry handled', { ticketId: ticket.id, customerId });
    return ticket;
  }

  /**
   * Resolves disputes by updating ticket status and recording resolution details
   * @param {number} bookingId - Booking ID
   * @param {Object} resolution - Resolution details { ticketId, staffId, resolutionDetails, ipAddress }
   * @returns {Promise<Object>} Updated ticket record
   */
  static async resolveDispute(bookingId, resolution) {
    const { ticketId, staffId, resolutionDetails, ipAddress } = resolution;

    if (!ticketId || !staffId || !resolutionDetails) {
      throw new AppError('Missing required fields', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    const ticket = await SupportTicket.findByPk(ticketId, {
      include: [{ model: Customer, as: 'customer' }, { model: Booking, as: 'booking' }],
    });
    if (!ticket || ticket.booking_id !== bookingId) {
      throw new AppError('Ticket not found or not associated with booking', 404, mTablesConstants.ERROR_CODES.TICKET_NOT_FOUND);
    }

    if (ticket.status === mTablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.RESOLVED ||
        ticket.status === mTablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.CLOSED) {
      throw new AppError('Ticket already resolved or closed', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    const staff = await Staff.findOne({
      where: { id: staffId, availability_status: mTablesConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
    });
    if (!staff) {
      throw new AppError('Staff unavailable', 400, mTablesConstants.ERROR_CODES.INVALID_TICKET_DETAILS);
    }

    await ticket.update({
      status: mTablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES.RESOLVED,
      assigned_staff_id: staffId,
      resolution_details: resolutionDetails,
      updated_at: new Date(),
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'merchant',
      action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.SUPPORT_TICKET_RESOLVED,
      details: { ticketId, bookingId, resolutionDetails },
      ipAddress: ipAddress || 'unknown',
    });

    await notificationService.sendNotification({
      userId: ticket.customer.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.SUPPORT_TICKET_RESOLVED,
      messageKey: 'support.ticket.resolved',
      messageParams: { ticketNumber: ticket.ticket_number },
      role: 'customer',
      module: 'mtables',
      ticketId,
    });

    await socketService.emit(null, 'support:ticket_resolved', {
      userId: ticket.customer.user_id,
      role: 'customer',
      ticketId,
      status: ticket.status,
    });

    logger.info('Dispute resolved', { ticketId, bookingId });
    return ticket;
  }

  /**
   * Communicates refund and cancellation policies to customers
   * @param {number} bookingId - Booking ID
   * @returns {Promise<void>}
   */
  static async communicatePolicies(bookingId) {
    const booking = await Booking.findByPk(bookingId, { include: [{ model: Customer, as: 'customer' }] });
    if (!booking) {
      throw new AppError('Booking not found', 404, mTablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
    }

    const policies = {
      refund: mTablesConstants.SUPPORT_SETTINGS.REFUND_POLICY,
      cancellation: mTablesConstants.SUPPORT_SETTINGS.CANCELLATION_POLICY,
    };

    await notificationService.sendNotification({
      userId: booking.customer.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.POLICY_COMMUNICATION,
      messageKey: 'support.policies.communicated',
      messageParams: {
        refundPolicy: policies.refund,
        cancellationPolicy: policies.cancellation,
      },
      role: 'customer',
      module: 'mtables',
      bookingId,
    });

    await auditService.logAction({
      userId: booking.customer.user_id,
      role: 'customer',
      action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.POLICY_COMMUNICATED,
      details: { bookingId, policies },
      ipAddress: 'unknown',
    });

    await socketService.emit(null, 'support:policies_communicated', {
      userId: booking.customer.user_id,
      role: 'customer',
      bookingId,
    });

    logger.info('Policies communicated', { bookingId });
  }

  /**
   * Awards gamification points for support interactions
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Points record
   */
  static async trackSupportGamification(customerId) {
    if (!customerId) {
      throw new AppError('Customer ID required', 400, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404, mTablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID);
    }

    const gamificationAction = gamificationConstants.CUSTOMER_ACTIONS.SUPPORT_INTERACTION;
    const pointsRecord = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: gamificationAction.action,
      languageCode: customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + gamificationConstants.POINTS_EXPIRY_DAYS);
    const gamification = await GamificationPoints.create({
      user_id: customer.user_id,
      role: 'customer',
      action: gamificationAction.action,
      points: pointsRecord.points,
      metadata: { customerId },
      expires_at: expiresAt,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: mTablesConstants.NOTIFICATION_TYPES.POINTS_AWARDED,
      messageKey: 'points.awarded',
      messageParams: { points: pointsRecord.points, action: gamificationAction.action },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'points:awarded', {
      userId: customer.user_id,
      role: 'customer',
      points: pointsRecord.points,
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: mTablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.POINTS_AWARDED,
      details: { customerId, points: pointsRecord.points, action: gamificationAction.action },
      ipAddress: 'unknown',
    });

    logger.info('Support gamification points awarded', { customerId, points: pointsRecord.points });
    return gamification;
  }
}

module.exports = SupportService;