'use strict';

/**
 * Dispute Service for mtables (Admin)
 * Manages booking and pre-order dispute resolution, status tracking, and escalation.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Dispute, Booking, Customer, MerchantBranch, InDiningOrder } = require('@models');
const disputeConstants = require('@constants/disputeConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

/**
 * Handles booking complaints.
 * @param {number} bookingId - Booking ID.
 * @param {Object} resolution - Resolution details (e.g., type, description).
 * @returns {Promise<Object>} Dispute resolution details.
 */
async function resolveBookingDisputes(bookingId, resolution) {
  try {
    if (!bookingId || !resolution?.type) {
      throw new AppError(
        'Booking ID and resolution type required',
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }],
    });
    if (!booking) {
      throw new AppError(
        'Booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const dispute = await Dispute.findOne({
      where: {
        service_id: bookingId,
        service_type: 'mtables',
        status: { [Op.in]: [disputeConstants.DISPUTE_STATUSES.PENDING, disputeConstants.DISPUTE_STATUSES.IN_REVIEW] },
      },
    });
    if (!dispute) {
      throw new AppError(
        'Dispute not found or already resolved',
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    // Validate resolution type
    if (!Object.values(disputeConstants.RESOLUTION_TYPES).includes(resolution.type)) {
      throw new AppError(
        'Invalid resolution type',
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    // Update dispute
    await dispute.update({
      status: disputeConstants.DISPUTE_STATUSES.RESOLVED,
      resolution: resolution.description || 'Issue resolved',
      resolution_type: resolution.type,
    });

    // Award gamification points
    const actionConfig = disputeConstants.GAMIFICATION_ACTIONS.DISPUTE_RESOLVED;
    if (actionConfig && actionConfig.roles.includes('customer')) {
      await pointService.awardPoints({
        userId: booking.customer.user_id,
        role: 'customer',
        action: actionConfig.action,
        points: actionConfig.points,
        metadata: { disputeId: dispute.id, bookingId },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      });
    }

    // Send notification
    await notificationService.sendNotification({
      userId: booking.customer.user_id.toString(),
      type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
      messageKey: 'dispute.resolved',
      messageParams: { disputeId: dispute.id, resolutionType: resolution.type },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'dispute:resolved', {
      userId: booking.customer.user_id.toString(),
      role: 'customer',
      disputeId: dispute.id,
      bookingId,
      resolutionType: resolution.type,
    });

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      role: 'merchant',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_RESOLVED,
      details: { disputeId: dispute.id, bookingId, resolution },
      ipAddress: 'unknown',
    });

    logger.info('Booking dispute resolved', { disputeId: dispute.id, bookingId });
    return {
      disputeId: dispute.id,
      bookingId,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionType: dispute.resolution_type,
    };
  } catch (error) {
    logger.logErrorEvent(`resolveBookingDisputes failed: ${error.message}`, { bookingId });
    throw error;
  }
}

/**
 * Addresses pre-order issues.
 * @param {number} bookingId - Booking ID.
 * @param {Object} resolution - Resolution details (e.g., type, description).
 * @returns {Promise<Object>} Dispute resolution details.
 */
async function resolvePreOrderDisputes(bookingId, resolution) {
  try {
    if (!bookingId || !resolution?.type) {
      throw new AppError(
        'Booking ID and resolution type required',
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }],
    });
    if (!booking) {
      throw new AppError(
        'Booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const inDiningOrder = await InDiningOrder.findOne({
      where: { customer_id: booking.customer_id, table_id: booking.table_id },
    });
    if (!inDiningOrder) {
      throw new AppError(
        'No pre-order found for this booking',
        404,
        disputeConstants.ERROR_CODES.INVALID_SERVICE
      );
    }

    const dispute = await Dispute.findOne({
      where: {
        service_id: bookingId,
        service_type: 'mtables',
        status: { [Op.in]: [disputeConstants.DISPUTE_STATUSES.PENDING, disputeConstants.DISPUTE_STATUSES.IN_REVIEW] },
      },
    });
    if (!dispute) {
      throw new AppError(
        'Dispute not found or already resolved',
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    // Validate resolution type
    if (!Object.values(disputeConstants.RESOLUTION_TYPES).includes(resolution.type)) {
      throw new AppError(
        'Invalid resolution type',
        400,
        disputeConstants.ERROR_CODES.INVALID_ISSUE
      );
    }

    // Update dispute
    await dispute.update({
      status: disputeConstants.DISPUTE_STATUSES.RESOLVED,
      resolution: resolution.description || 'Pre-order issue resolved',
      resolution_type: resolution.type,
    });

    // Award gamification points
    const actionConfig = disputeConstants.GAMIFICATION_ACTIONS.DISPUTE_RESOLVED;
    if (actionConfig && actionConfig.roles.includes('customer')) {
      await pointService.awardPoints({
        userId: booking.customer.user_id,
        role: 'customer',
        action: actionConfig.action,
        points: actionConfig.points,
        metadata: { disputeId: dispute.id, bookingId, orderId: inDiningOrder.id },
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
      });
    }

    // Send notification
    await notificationService.sendNotification({
      userId: booking.customer.user_id.toString(),
      type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_RESOLVED,
      messageKey: 'dispute.pre_order_resolved',
      messageParams: { disputeId: dispute.id, resolutionType: resolution.type },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'dispute:pre_order_resolved', {
      userId: booking.customer.user_id.toString(),
      role: 'customer',
      disputeId: dispute.id,
      bookingId,
      orderId: inDiningOrder.id,
      resolutionType: resolution.type,
    });

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      role: 'merchant',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_RESOLVED,
      details: { disputeId: dispute.id, bookingId, orderId: inDiningOrder.id, resolution },
      ipAddress: 'unknown',
    });

    logger.info('Pre-order dispute resolved', { disputeId: dispute.id, bookingId, orderId: inDiningOrder.id });
    return {
      disputeId: dispute.id,
      bookingId,
      orderId: inDiningOrder.id,
      status: dispute.status,
      resolution: dispute.resolution,
      resolutionType: dispute.resolution_type,
    };
  } catch (error) {
    logger.logErrorEvent(`resolvePreOrderDisputes failed: ${error.message}`, { bookingId });
    throw error;
  }
}

/**
 * Monitors dispute resolution status.
 * @param {number} disputeId - Dispute ID.
 * @returns {Promise<Object>} Dispute status details.
 */
async function trackDisputeStatus(disputeId) {
  try {
    if (!disputeId) {
      throw new AppError(
        'Dispute ID required',
        400,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    const dispute = await Dispute.findByPk(disputeId, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }] },
      ],
    });
    if (!dispute || dispute.service_type !== 'mtables') {
      throw new AppError(
        'Dispute not found',
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    // Send notification
    await notificationService.sendNotification({
      userId: dispute.customer_id.toString(),
      type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_UPDATED,
      messageKey: 'dispute.status_updated',
      messageParams: { disputeId, status: dispute.status },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'dispute:status_updated', {
      userId: dispute.customer_id.toString(),
      role: 'customer',
      disputeId,
      status: dispute.status,
    });

    // Log audit action
    await auditService.logAction({
      userId: dispute.customer_id.toString(),
      role: 'customer',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_UPDATED,
      auditLogs: { disputeId, status: dispute.status },
      ipAddress: 'unknown',
    });

    logger.info('Dispute status tracked', { disputeId });
    return {
      disputeId,
      serviceId: dispute.service_id,
      serviceType: dispute.service_type,
      status: dispute.status,
      issueType: dispute.issue_type,
      resolution: dispute.resolution,
      resolutionType: dispute.resolution_type,
    };
  } catch (error) {
    logger.logErrorEvent(`trackDisputeStatus failed: ${error.message}`, { disputeId });
    throw error;
  }
}

/**
 * Assigns unresolved disputes to higher authority.
 * @param {number} disputeId - Dispute ID.
 * @returns {Promise<Object>} Escalation details.
 */
async function escalateDisputes(disputeId) {
  try {
    if (!disputeId) {
      throw new AppError(
        'Dispute ID required',
        400,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    const dispute = await Dispute.findByPk(disputeId, {
      include: [
        { model: Booking, as: 'booking', include: [{ model: MerchantBranch, as: 'branch' }, { model: Customer, as: 'customer' }] },
      ],
    });
    if (!dispute || dispute.service_type !== 'mtables') {
      throw new AppError(
        'Dispute not found',
        404,
        disputeConstants.ERROR_CODES.DISPUTE_NOT_FOUND
      );
    }

    if (dispute.status === disputeConstants.DISPUTE_STATUSES.RESOLVED || dispute.status === disputeConstants.DISPUTE_STATUSES.CLOSED) {
      throw new AppError(
        'Dispute already resolved or closed',
        400,
        disputeConstants.ERROR_CODES.DISPUTE_ALREADY_RESOLVED
      );
    }

    // Update dispute status to in_review (escalated)
    await dispute.update({
      status: disputeConstants.DISPUTE_STATUSES.IN_REVIEW,
    });

    // Send notification to customer
    await notificationService.sendNotification({
      userId: dispute.customer_id.toString(),
      type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_UPDATED,
      messageKey: 'dispute.escalated',
      messageParams: { disputeId },
      role: 'customer',
      module: 'mtables',
    });

    // Notify admin (assuming super_admin role for escalation)
    await notificationService.sendNotification({
      userId: null, // Broadcast to admins
      type: disputeConstants.NOTIFICATION_TYPES.DISPUTE_UPDATED,
      messageKey: 'dispute.escalated_admin',
      messageParams: { disputeId, serviceId: dispute.service_id },
      role: 'admin',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'dispute:escalated', {
      userId: dispute.customer_id.toString(),
      role: 'customer',
      disputeId,
      adminRole: 'super_admin',
    });

    // Log audit action
    await auditService.logAction({
      userId: dispute.customer_id.toString(),
      role: 'customer',
      action: disputeConstants.AUDIT_TYPES.DISPUTE_UPDATED,
      details: { disputeId, status: 'escalated' },
      ipAddress: 'unknown',
    });

    logger.info('Dispute escalated', { disputeId });
    return {
      disputeId,
      status: dispute.status,
      serviceId: dispute.service_id,
      escalatedTo: 'super_admin',
    };
  } catch (error) {
    logger.logErrorEvent(`escalateDisputes failed: ${error.message}`, { disputeId });
    throw error;
  }
}

module.exports = {
  resolveBookingDisputes,
  resolvePreOrderDisputes,
  trackDisputeStatus,
  escalateDisputes,
};