'use strict';

/**
 * Payment Service for mtables (Admin)
 * Manages booking payments, split payments, refunds, and payment gamification.
 * Integrates with notification, socket, audit, point, and localization services.
 *
 * Last Updated: May 27, 2025
 */

const { Booking, Wallet, Payment, WalletTransaction, Customer, MerchantBranch } = require('@models');
const paymentConstants = require('@constants/common/paymentConstants');
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
 * Handles booking payments.
 * @param {number} bookingId - Booking ID.
 * @param {number} amount - Payment amount.
 * @param {number} walletId - Wallet ID.
 * @returns {Promise<Object>} Payment details.
 */
async function processPayment(bookingId, amount, walletId) {
  try {
    if (!bookingId || !amount || !walletId) {
      throw new AppError(
        'booking_id, amount, and wallet_id required',
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking) {
      throw new AppError(
        'booking not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
      throw new AppError(
        'wallet not found',
        404,
        paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }

    if (wallet.balance < amount) {
      throw new AppError(
        'insufficient funds',
        400,
        paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS
      );
    }

    if (amount < paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT || amount > paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT) {
      throw new AppError(
        `amount must be between ${paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT} and ${paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT}`,
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    // Deduct from wallet
    await wallet.update({ balance: wallet.balance - amount });

    // Create payment record
    const payment = await Payment.create({
      in_dining_order_id: booking.inDiningOrder?.id,
      customer_id: booking.customer_id,
      merchant_id: booking.merchant_id,
      amount,
      payment_method: paymentConstants.PAYMENT_METHODS.WALLET_TRANSFER,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      transaction_id: `TXN-${Date.now()}-${walletId}`,
    });

    // Create wallet transaction
    await WalletTransaction.create({
      wallet_id: walletId,
      type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
      amount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Payment for booking ${bookingId}`,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: wallet.user_id.toString(),
      type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: 'payment.completed',
      messageParams: { bookingId, amount },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'payment:completed', {
      userId: wallet.user_id.toString(),
      role: 'customer',
      bookingId,
      paymentId: payment.id,
    });

    // Log audit action
    await auditService.logAction({
      userId: wallet.user_id.toString(),
      action: paymentConstants.SUCCESS_MESSAGES.PAYMENT_COMPLETED,
      details: { bookingId, paymentId: payment.id, amount },
      ipAddress: 'unknown',
    });

    logger.info('Payment processed', { bookingId, paymentId: payment.id });
    return { bookingId, paymentId: payment.id, amount, status: payment.status };
  } catch (error) {
    logger.logErrorEvent(`processPayment failed: ${error.message}`, { bookingId, walletId });
    throw error;
  }
}

/**
 * Facilitates group split payments.
 * @param {number} bookingId - Booking ID.
 * @param {Array} payments - Array of payment details (customerId, amount, walletId).
 * @returns {Promise<Object>} Split payment details.
 */
async function manageSplitPayments(bookingId, payments) {
  try {
    if (!bookingId || !payments?.length) {
      throw new AppError(
        'booking_id and payments required',
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking || !booking.inDiningOrder) {
      throw new AppError(
        'booking or order not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const totalSplitAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalSplitAmount !== booking.inDiningOrder.total_amount) {
      throw new AppError(
        'split amounts do not match order total',
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const processedPayments = [];
    for (const payment of payments) {
      const wallet = await Wallet.findByPk(payment.walletId);
      if (!wallet) {
        throw new AppError(
          'wallet not found',
          404,
          paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
      }

      if (wallet.balance < payment.amount) {
        throw new AppError(
          'insufficient funds',
          400,
          paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS
        );
      }

      // Deduct from wallet
      await wallet.update({ balance: wallet.balance - payment.amount });

      // Create payment record
      const paymentRecord = await Payment.create({
        in_dining_order_id: booking.inDiningOrder.id,
        customer_id: payment.customerId,
        merchant_id: booking.merchant_id,
        amount: payment.amount,
        payment_method: paymentConstants.PAYMENT_METHODS.WALLET_TRANSFER,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        transaction_id: `TXN-${Date.now()}-${payment.walletId}`,
      });

      // Create wallet transaction
      await WalletTransaction.create({
        wallet_id: payment.walletId,
        type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
        amount: payment.amount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        description: `Split payment for booking ${bookingId}`,
      });

      processedPayments.push(paymentRecord);

      // Send notification
      await notificationService.sendNotification({
        userId: wallet.user_id.toString(),
        type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
        messageKey: 'payment.split_completed',
        messageParams: { bookingId, amount: payment.amount },
        role: 'customer',
        module: 'mtables',
      });

      // Emit socket event
      await socketService.emit(null, 'payment:split_completed', {
        userId: wallet.user_id.toString(),
        role: 'customer',
        bookingId,
        paymentId: paymentRecord.id,
      });
    }

    // Update order status
    await booking.inDiningOrder.update({ status: 'paid' });

    // Log audit action
    await auditService.logAction({
      userId: booking.merchant_id.toString(),
      action: paymentConstants.SUCCESS_MESSAGES.PAYMENT_COMPLETED,
      details: { bookingId, orderId: booking.inDiningOrder.id, splitCount: processedPayments.length },
      ipAddress: 'unknown',
    });

    logger.info('Split payments processed', { bookingId, splitCount: processedPayments.length });
    return {
      bookingId,
      orderId: booking.inDiningOrder.id,
      payments: processedPayments.map(p => ({ paymentId: p.id, amount: p.amount, customerId: p.customer_id })),
    };
  } catch (error) {
    logger.logErrorEvent(`manageSplitPayments failed: ${error.message}`, { bookingId });
    throw error;
  }
}

/**
 * Processes refunds for a booking.
 * @param {number} bookingId - Booking ID.
 * @param {number} walletId - Wallet ID.
 * @returns {Promise<Object>} Refund details.
 */
async function issueRefund(bookingId, walletId) {
  try {
    if (!bookingId || !walletId) {
      throw new AppError(
        'booking_id and wallet_id required',
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: Customer, as: 'customer' }],
    });
    if (!booking || !booking.inDiningOrder) {
      throw new AppError(
        'booking or order not found',
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const payment = await Payment.findOne({
      where: { in_dining_order_id: booking.inDiningOrder.id, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
    });
    if (!payment) {
      throw new AppError(
        'no completed payment found',
        404,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
      throw new AppError(
        'wallet not found',
        404,
        paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }

    // Process refund
    await wallet.update({ balance: wallet.balance + payment.amount });

    // Update payment status
    await payment.update({
      status: paymentConstants.TRANSACTION_STATUSES.REFUNDED,
      refund_status: 'processed',
      refund_details: { reason: 'booking refund', processedAt: new Date() },
    });

    // Create wallet transaction
    await WalletTransaction.create({
      wallet_id: walletId,
      type: paymentConstants.TRANSACTION_TYPES.REFUND,
      amount: payment.amount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Refund for booking ${bookingId}`,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: wallet.user_id.toString(),
      type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      messageKey: 'payment.refunded',
      messageParams: { bookingId, amount: payment.amount },
      role: 'customer',
      module: 'mtables',
    });

    // Emit socket event
    await socketService.emit(null, 'payment:refunded', {
      userId: wallet.user_id.toString(),
      role: 'customer',
      bookingId,
      paymentId: payment.id,
    });

    // Log audit action
    await auditService.logAction({
      userId: wallet.user_id.toString(),
      action: paymentConstants.SUCCESS_MESSAGES.PAYMENT_COMPLETED,
      details: { bookingId, paymentId: payment.id, refundAmount: payment.amount },
      ipAddress: 'unknown',
    });

    logger.info('Refund issued', { bookingId, paymentId: payment.id });
    return {
      bookingId,
      paymentId: payment.id,
      refundAmount: payment.amount,
      status: payment.status,
    };
  } catch (error) {
    logger.logErrorEvent(`issueRefund failed: ${error.message}`, { bookingId, walletId });
    throw error;
  }
}

/**
 * Awards gamification points for payment actions.
 * @param {number} customerId - Customer ID.
 * @returns {Promise<Object>} Points awarded details.
 */
async function trackPaymentGamification(customerId) {
  try {
    if (!customerId) {
      throw new AppError(
        'customer_id required',
        400,
        mtablesConstants.ERROR_CODES.INVALID_CUSTOMER_ID
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

    const actionConfig = merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PAYMENT_STREAK;
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
      metadata: { customerId },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
    });

    // Send notification
    await notificationService.sendNotification({
      userId: customer.user_id.toString(),
      type: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GAMIFICATION_REWARD,
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
      customerId,
    });

    // Log audit action
    await auditService.logAction({
      userId: customer.user_id.toString(),
      action: merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PAYMENT_STREAK.action,
      details: { customerId, points: actionConfig.points },
      ipAddress: 'unknown',
    });

    logger.info('Payment gamification points awarded', { customerId, points: actionConfig.points });
    return {
      customerId,
      points: actionConfig.points,
    };
  } catch (error) {
    logger.logErrorEvent(`trackPaymentGamification failed: ${error.message}`, { customerId });
    throw error;
  }
}

module.exports = {
  processPayment,
  manageSplitPayments,
  issueRefund,
  trackPaymentGamification,
};