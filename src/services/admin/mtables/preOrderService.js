'use strict';

const { Booking, Customer, InDiningOrder, MerchantBranch } = require('@models');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const paymentService = require('@services/admin/mtables/paymentService');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function monitorPreOrders(bookingId) {
  try {
    if (!bookingId) {
      throw new AppError(
        formatMessage('error.missing_booking_id'),
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
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const preOrder = booking.inDiningOrder;
    if (!preOrder) {
      throw new AppError(
        formatMessage('error.no_pre_order'),
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

    logger.info('Pre-order monitored', { bookingId, orderId: preOrder.id });
    return preOrderDetails;
  } catch (error) {
    logger.logErrorEvent(`monitorPreOrders failed: ${error.message}`, { bookingId });
    throw error;
  }
}

async function manageFriendInvitations(bookingId, invitation) {
  try {
    if (!bookingId || !invitation?.friendIds) {
      throw new AppError(
        formatMessage('error.missing_invitation_details'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: Customer, as: 'customer' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking) {
      throw new AppError(
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    if (invitation.friendIds.length > mtablesConstants.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE - 1) {
      throw new AppError(
        formatMessage('error.group_size_exceeded', {
          limit: mtablesConstants.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE,
        }),
        400,
        mtablesConstants.ERROR_CODES.INVALID_PARTY_SIZE
      );
    }

    const friends = await Customer.findAll({
      where: { id: invitation.friendIds },
      attributes: ['id', 'user_id'],
    });
    if (friends.length !== invitation.friendIds.length) {
      throw new AppError(
        formatMessage('error.invalid_friend_ids'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
      );
    }

    await booking.update({
      party_notes: `${booking.party_notes || ''} | Group: ${friends.length} invited`,
      booking_metadata: {
        ...booking.booking_metadata,
        invitedFriends: invitation.friendIds,
      },
    });

    logger.info('Friend invitations managed', { bookingId, invitedCount: friends.length });
    return { bookingId, invitedFriends: invitation.friendIds, status: 'sent' };
  } catch (error) {
    logger.logErrorEvent(`manageFriendInvitations failed: ${error.message}`, { bookingId });
    throw error;
  }
}

async function processPartyPayments(bookingId, paymentDetails) {
  try {
    if (!bookingId || !paymentDetails?.splits) {
      throw new AppError(
        formatMessage('error.missing_payment_splits'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_BOOKING_DETAILS
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking || !booking.inDiningOrder) {
      throw new AppError(
        formatMessage('error.booking_order_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const totalSplitAmount = paymentDetails.splits.reduce((sum, split) => sum + split.amount, 0);
    if (totalSplitAmount !== booking.inDiningOrder.total_amount) {
      throw new AppError(
        formatMessage('error.split_amount_mismatch'),
        400,
        mtablesConstants.ERROR_CODES.PAYMENT_FAILED
      );
    }

    const customerIds = paymentDetails.splits.map(split => split.customerId);
    const customers = await Customer.findAll({
      where: { id: customerIds },
      attributes: ['id', 'user_id'],
    });
    if (customers.length !== customerIds.length) {
      throw new AppError(
        formatMessage('error.invalid_customer_ids'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
      );
    }

    const paymentSplits = paymentDetails.splits.map(split => ({
      customerId: split.customerId,
      amount: split.amount,
      walletId: split.walletId,
    }));

    const result = await paymentService.manageSplitPayments(bookingId, paymentSplits);

    logger.info('Party payments processed', { bookingId, splitCount: result.payments.length });
    return {
      bookingId,
      orderId: booking.inDiningOrder.id,
      payments: result.payments,
    };
  } catch (error) {
    logger.logErrorEvent(`processPartyPayments failed: ${error.message}`, { bookingId });
    throw error;
  }
}

module.exports = {
  monitorPreOrders,
  manageFriendInvitations,
  processPartyPayments,
};