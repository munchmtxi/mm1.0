'use strict';

const { Booking, Wallet, Payment, WalletTransaction, MerchantBranch } = require('@models');
const paymentConstants = require('@constants/paymentConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const logger = require('@utils/logger');
const { AppError } = require('@utils/AppError');

async function processPayment(bookingId, amount, walletId) {
  try {
    if (!bookingId || !amount || !walletId) {
      throw new AppError(
        formatMessage('error.missing_payment_details'),
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!booking) {
      throw new AppError(
        formatMessage('error.booking_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
      throw new AppError(
        formatMessage('error.wallet_not_found'),
        404,
        paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }

    if (wallet.balance < amount) {
      throw new AppError(
        formatMessage('error.insufficient_funds'),
        400,
        paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS
      );
    }

    if (amount < paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT || amount > paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT) {
      throw new AppError(
        formatMessage('error.invalid_payment_amount', {
          min: paymentConstants.FINANCIAL_LIMITS.PAYMENT.MIN_AMOUNT,
          max: paymentConstants.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT,
        }),
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    await wallet.update({ balance: wallet.balance - amount });

    const payment = await Payment.create({
      in_dining_order_id: booking.inDiningOrder?.id,
      customer_id: booking.customer_id,
      merchant_id: booking.merchant_id,
      amount,
      payment_method: paymentConstants.PAYMENT_METHODS.WALLET_TRANSFER,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      transaction_id: `TXN-${Date.now()}-${walletId}`,
    });

    await WalletTransaction.create({
      wallet_id: walletId,
      type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
      amount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Payment for booking ${bookingId}`,
    });

    logger.info('Payment processed', { bookingId, paymentId: payment.id });
    return { bookingId, paymentId: payment.id, amount, status: payment.status };
  } catch (error) {
    logger.logErrorEvent(`processPayment failed: ${error.message}`, { bookingId, walletId });
    throw error;
  }
}

async function manageSplitPayments(bookingId, payments) {
  try {
    if (!bookingId || !payments?.length) {
      throw new AppError(
        formatMessage('error.missing_split_payment_details'),
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
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

    const totalSplitAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalSplitAmount !== booking.inDiningOrder.total_amount) {
      throw new AppError(
        formatMessage('error.split_amount_mismatch'),
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const processedPayments = [];
    for (const payment of payments) {
      const wallet = await Wallet.findByPk(payment.walletId);
      if (!wallet) {
        throw new AppError(
          formatMessage('error.wallet_not_found'),
          404,
          paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
        );
      }

      if (wallet.balance < payment.amount) {
        throw new AppError(
          formatMessage('error.insufficient_funds'),
          400,
          paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS
        );
      }

      await wallet.update({ balance: wallet.balance - payment.amount });

      const paymentRecord = await Payment.create({
        in_dining_order_id: booking.inDiningOrder.id,
        customer_id: payment.customerId,
        merchant_id: booking.merchant_id,
        amount: payment.amount,
        payment_method: paymentConstants.PAYMENT_METHODS.WALLET_TRANSFER,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        transaction_id: `TXN-${Date.now()}-${payment.walletId}`,
      });

      await WalletTransaction.create({
        wallet_id: payment.walletId,
        type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
        amount: payment.amount,
        currency: wallet.currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        description: `Split payment for booking ${bookingId}`,
      });

      processedPayments.push(paymentRecord);
    }

    await booking.inDiningOrder.update({ status: 'paid' });

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

async function issueRefund(bookingId, walletId) {
  try {
    if (!bookingId || !walletId) {
      throw new AppError(
        formatMessage('error.missing_refund_details'),
        400,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: InDiningOrder, as: 'inDiningOrder' }, { model: Customer, as: 'customer' }],
    });
    if (!booking || !booking.inDiningOrder) {
      throw new AppError(
        formatMessage('error.booking_order_not_found'),
        404,
        mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND
      );
    }

    const payment = await Payment.findOne({
      where: { in_dining_order_id: booking.inDiningOrder.id, status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
    });
    if (!payment) {
      throw new AppError(
        formatMessage('error.no_completed_payment'),
        404,
        paymentConstants.ERROR_CODES.TRANSACTION_FAILED
      );
    }

    const wallet = await Wallet.findByPk(walletId);
    if (!wallet) {
      throw new AppError(
        formatMessage('error.wallet_not_found'),
        404,
        paymentConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }

    await wallet.update({ balance: wallet.balance + payment.amount });

    await payment.update({
      status: paymentConstants.TRANSACTION_STATUSES.REFUNDED,
      refund_status: 'processed',
      refund_details: { reason: 'booking refund', processedAt: new Date() },
    });

    await WalletTransaction.create({
      wallet_id: walletId,
      type: paymentConstants.TRANSACTION_TYPES.REFUND,
      amount: payment.amount,
      currency: wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      description: `Refund for booking ${bookingId}`,
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

module.exports = {
  processPayment,
  manageSplitPayments,
  issueRefund,
};