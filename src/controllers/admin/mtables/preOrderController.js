'use strict';

const preOrderService = require('@services/admin/mtables/preOrderService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');

async function monitorPreOrders(req, res, next) {
  try {
    const { bookingId } = req.body;
    const result = await preOrderService.monitorPreOrders(bookingId);

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: mtablesConstants.NOTIFICATION_TYPES.ORDER_STATUS,
      messageKey: 'preorder.status_updated',
      messageParams: { bookingId, status: result.status },
      role: 'customer',
      module: 'mtables',
    });

    await socketService.emit(null, 'preorder:status_updated', {
      userId: req.user.id,
      role: 'customer',
      preOrderDetails: result,
    });

    await auditService.logAction({
      userId: req.user.id,
      role: 'admin',
      action: mtablesConstants.AUDIT_TYPES.ORDER_STATUS_UPDATED,
      details: { bookingId, orderId: result.orderId },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.preorder_monitored'),
    });
  } catch (error) {
    next(error);
  }
}

async function manageFriendInvitations(req, res, next) {
  try {
    const { bookingId, invitation } = req.body;
    const result = await preOrderService.manageFriendInvitations(bookingId, invitation);

    for (const friendId of result.invitedFriends) {
      await notificationService.sendNotification({
        userId: friendId.toString(),
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BOOKING_INVITATION,
        messageKey: 'preorder.friend_invitation',
        messageParams: { bookingId, message: invitation.message || 'Join us!' },
        role: 'customer',
        module: 'mtables',
      });

      await socketService.emit(null, 'preorder:friend_invited', {
        userId: friendId.toString(),
        role: 'customer',
        bookingId,
        inviterId: req.user.id,
      });
    }

    await auditService.logAction({
      userId: req.user.id,
      role: 'admin',
      action: mtablesConstants.AUDIT_TYPES.BOOKING_UPDATED,
      details: { bookingId, invitedFriends: result.invitedFriends },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.invitations_sent'),
    });
  } catch (error) {
    next(error);
  }
}

async function processPartyPayments(req, res, next) {
  try {
    const { bookingId, paymentDetails } = req.body;
    const result = await preOrderService.processPartyPayments(bookingId, paymentDetails);

    for (const payment of result.payments) {
      await notificationService.sendNotification({
        userId: payment.customerId.toString(),
        notificationType: paymentConstants.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        messageKey: 'preorder.payment_processed',
        messageParams: { bookingId, amount: payment.amount },
        role: 'customer',
        module: 'mtables',
      });

      await socketService.emit(null, 'preorder:payment_processed', {
        userId: payment.customerId.toString(),
        role: 'customer',
        bookingId,
        orderId: result.orderId,
      });
    }

    await auditService.logAction({
      userId: req.user.id,
      role: 'admin',
      action: paymentConstants.AUDIT_TYPES.PAYMENT_COMPLETED,
      details: { bookingId, orderId: result.orderId, splitCount: result.payments.length },
      ipAddress: req.ip,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: formatMessage('success.party_payments_processed'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  monitorPreOrders,
  manageFriendInvitations,
  processPartyPayments,
};