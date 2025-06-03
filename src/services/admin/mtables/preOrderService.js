'use strict';

/**
 * Pre-Order Service for mtables (Admin)
 * Manages pre-order monitoring, friend invitations, gamification points, and party payments.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Booking, Customer, InDiningOrder, MerchantBranch } = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const merchantConstants = require('@constants/common/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils');
const { AppError } = require('@utils/AppError');

/**
 * Tracks pre-order details for a booking.
 * @param {number} bookingId - Booking ID.
 * @returns {Promise<Object>} Pre-order details.
 */
async function monitorPreOrders(bookingId) {
  try {
    if (!bookingId) {
      throw new AppError(
        'booking_id required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: MerchantBranch, as: 'branch' },
        { model: InDiningOrder, as: 'inDiningOrder' },
      ],
    });
    if (!booking) {
      throw new AppError(
        'booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const preOrder = booking.inDiningOrder;
    if (!preOrder) {
      throw new AppError(
        'no pre-order found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const preOrderDetails = {
      bookingId,
      orderId: preOrder.id,
      customerId: booking.customer_id,
      items: preOrder.items,
      totalAmount: preOrder.total_amount,
      status: preOrder.status,
      dietaryFilters: preOrder.dietary_filters || [],
    };

    // Send notification
    await notificationService.sendNotification({
      userId: booking.customer.user_id.toString(),
      type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.ORDER_STATUS,
      messageKey: 'preorder.status_updated',
      messageParams: { bookingId, status: preOrder.status },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'preorder:status_updated', {
      userId: booking.customer.user_id.toString(),
      role: 'customer',
      preOrderDetails,
    });

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      action: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.ORDER_STATUS,
      details: { bookingId, orderId: preOrder.id },
      ipAddress: 'unknown',
    });

    logger.info('Pre-order monitored', { bookingId, orderId: preOrder.id });
    return preOrderDetails;
  } catch (error) {
    logger.logErrorEvent(`monitorPreOrders failed: ${error.message}`, { bookingId });
    throw error;
  }
}

/**
 * Oversees group coordination and friend invitations.
 * @param {number} bookingId - Booking ID.
 * @param {Object} invitation - Invitation details (e.g., friendIds, message).
 * @returns {Promise<Object>} Invitation status.
 */
async function manageFriendInvitations(bookingId, invitation) {
  try {
    if (!bookingId || !invitation?.friendIds) {
      throw new AppError(
        'booking_id and friend_ids required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking) {
      throw new AppError(
        'booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    if (invitation.friendIds.length > mtablesConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE - 1) {
      throw new AppError(
        `group size exceeds limit: ${mtablesConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE}`,
        400,
        mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE
      );
    }

    // Validate friend IDs
    const friends = await Customer.findAll({
      where: { id: invitation.friendIds },
      attributes: ['id', 'user_id'],
    });
    if (friends.length !== invitation.friendIds.length) {
      throw new AppError(
        'invalid friend IDs',
        400,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
      );
    }

    // Update booking with group details
    await booking.update({
      party_notes: `${booking.party_notes || ''} | Group: ${friends.length} invited`,
      booking_metadata: {
        ...booking.booking_metadata,
        invitedFriends: invitation.friendIds,
      },
    });

    // Send notifications to friends
    for (const friend of friends) {
      await notificationService.sendNotification({
        userId: friend.user_id.toString(),
        type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_INVITATION,
        messageKey: 'preorder.friend_invitation',
        messageParams: { bookingId, message: invitation.message || 'Join us!' },
        role: 'customer',
        module: 'mtables',
      });

      // Emit socket event
      await socketService.emit(null, 'preorder:friend_invited', {
        userId: friend.user_id.toString(),
        role: 'customer',
        bookingId,
        inviterId: booking.customer_id,
      });
    }

    // Log audit action
    await auditService.logAction({
      userId: booking.customer.user_id.toString(),
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { bookingId, invitedFriends: invitation.friendIds },
      ipAddress: 'unknown',
    });

    logger.info('Friend invitations managed', { bookingId, invitedCount: friends.length });
    return { bookingId, invitedFriends: invitation.friendIds, status: 'sent' };
  } catch (error) {
    logger.logErrorEvent(`manageFriendInvitations failed: ${error.message}`, { bookingId });
    throw error;
  }
}

/**
 * Awards gamification points for pre-order actions.
 * @param {number} customerId - Customer ID.
 * @param {number} bookingId - Booking ID.
 * @returns {Promise<Object>} Points awarded details.
 */
async function awardGamificationPoints(customerId, bookingId) {
  try {
    if (!customerId || !bookingId) {
      throw new AppError(
        'customer_id and booking_id required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const customer = await Customer.findByPk(customerId, {
      include: [{ model: sequelize.models.User, as: 'user' }],
    });
    if (!customer) {
      throw new AppError(
        'customer not found',
        404,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }],
    });
    if (!booking || !booking.inDiningOrder) {
      throw new AppError(
        'booking or pre-order not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const actionConfig = merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PRE_ORDER;
    if (!actionConfig || !actionConfig.roles.includes('customer')) {
      throw new AppError(
        'invalid gamification action',
        400,
        mtablesConstants.ERROR_CODES.GAMIFICATION_POINTS_FAILED
      );
    }

    // Award points
    const pointsAwarded = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: actionConfig.action,
      points: actionConfig.points,
      metadata: { bookingId, orderId: booking.inDiningOrder.id },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
    });

    // Send notification
    await notificationService.sendNotification({
      userId: customer.user_id.toString(),
      type: mtablesConstants.NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
      messageKey: 'gamification.points_awarded',
      messageParams: { points: actionConfig.points, action: actionConfig.name },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'gamification:points_awarded', {
      userId: customer.user_id.toString(),
      role: 'customer',
      points: actionConfig.points,
      bookingId,
    });

    // Log audit action
    await auditService.logAction({
      userId: customer.user_id.toString(),
      action: mtablesConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BOOKING_UPDATED,
      details: { bookingId, points: actionConfig.points },
      ipAddress: 'unknown',
    });

    logger.info('Gamification points awarded', { customerId, bookingId, points: actionConfig.points });
    return {
      customerId,
      bookingId,
      points: actionConfig.points,
    };
  } catch (error) {
    logger.logErrorEvent(`awardGamificationPoints failed: ${error.message}`, { customerId, bookingId });
    throw error;
  }
}

/**
 * Handles group payments for a party.
 * @param {number} bookingId - Booking ID.
 * @param {Object} paymentDetails - Payment splits (e.g., customerId, amount).
 * @returns {Promise<Object>} Payment processing status.
 */
async function processPartyPayments(bookingId, paymentDetails) {
  try {
    if (!bookingId || !paymentDetails?.splits) {
      throw new AppError(
        'booking_id and payment splits required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking || !booking.inDiningOrder) {
      throw new AppError(
        'booking or pre-order not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const totalSplitAmount = paymentDetails.splits.reduce((sum, split) => sum + split.amount, 0);
    if (totalSplitAmount !== booking.inDiningOrder.total_amount) {
      throw new AppError(
        'split amounts do not match order total',
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }

    // Validate customer IDs
    const customerIds = paymentDetails.splits.map(split => split.customerId);
    const customers = await Customer.findAll({
      where: { id: customerIds },
      attributes: ['id', 'user_id'],
    });
    if (customers.length !== customerIds.length) {
      throw new AppError(
        'invalid customer IDs',
        400,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
      );
    }

    // Process payments (assuming paymentService handles actual processing)
    const payments = [];
    for (const split of paymentDetails.splits) {
      const payment = await sequelize.models.Payment.create({
        in_dining_order_id: booking.inDiningOrder.id,
        customer_id: split.customerId,
        merchant_id: booking.merchant_id,
        amount: split.amount,
        payment_method: split.paymentMethod || paymentConstants.PAYMENT_METHODS.WALLET_TRANSFER,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        transaction_id: `TXN-${Date.now()}-${split.customerId}`,
      });
      payments.push(payment);
    }

    // Update order status
    await booking.inDiningOrder.update({ status: 'paid' });

    // Send notifications
    for (const customer of customers) {
      await notificationService.sendNotification({
        userId: customer.user_id.toString(),
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.ORDER_STATUS,
        messageKey: 'preorder.payment_processed',
        messageParams: { bookingId, amount: paymentDetails.splits.find(s => s.customerId === customer.id).amount },
        role: 'customer',
        module: 'mtables',
      });

      // Emit socket event
      await socketService.emit(null, 'preorder:payment_processed', {
        userId: customer.user_id.toString(),
        role: 'customer',
        bookingId,
        orderId: booking.inDiningOrder.id,
      });
    }

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      action: merchantConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.COMPLETED,
      details: { bookingId, orderId: booking.inDiningOrder.id, splitCount: payments.length },
      ipAddress: 'unknown',
    });

    logger.info('Party payments processed', { bookingId, splitCount: payments.length });
    return {
      bookingId,
      orderId: booking.inDiningOrder.id,
      payments: payments.map(p => ({ paymentId: p.id, amount: p.amount, customerId: p.customer_id })),
    };
  } catch (error) {
    logger.logErrorEvent(`processPartyPayments failed: ${error.message}`, { bookingId });
    throw error;
  }
}

module.exports = {
  monitorPreOrders,
  manageFriendInvitations,
  awardGamificationPoints,
  processPartyPayments,
};