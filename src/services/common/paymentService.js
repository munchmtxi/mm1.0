'use strict';

const { Payment, Customer } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');

const createPaymentIntent = async (userId, amount, type, merchant_id, metadata = {}) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    logger.error('Customer not found', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  if (amount <= 0) {
    logger.warn('Invalid payment amount', { amount });
    throw new AppError('Invalid payment amount', 400, 'INVALID_AMOUNT');
  }

  // Support both ride_id and rideId in metadata
  const rideId = metadata.ride_id ?? metadata.rideId;
  if (type === 'fare') {
    if (!rideId || !Number.isInteger(rideId) || rideId < 1) {
      logger.warn('Valid rideId required for fare payment', { userId, type, rideId });
      throw new AppError('Valid rideId is required for fare payment', 400, 'INVALID_INPUT');
    }
  }

  if (type !== 'fare' && type !== 'tip' && !merchant_id) {
    if (type === 'subscription' && ['ride_standard', 'ride_premium'].includes(metadata.subscription_type)) {
      logger.info('Merchant ID optional for ride subscription', { subscription_type: metadata.subscription_type });
    } else {
      logger.warn('Merchant ID is required', { type, subscription_type: metadata.subscription_type });
      throw new AppError('Merchant ID is required', 400, 'INVALID_MERCHANT');
    }
  }

  const { ride_id, rideId: _, ...otherMetadata } = metadata;

  const payment = await Payment.create({
    customer_id: customer.id,
    merchant_id: merchant_id || null,
    ride_id: rideId || null,
    amount,
    tip_amount: type === 'tip' ? amount : 0,
    status: 'pending',
    payment_method: metadata.payment_method || 'mobile_money',
    payment_details: { type, ...otherMetadata },
  });

  logger.info('Payment intent created', { paymentId: payment.id, customerId: customer.id, type, rideId });
  socketService.emitToUser(userId, 'payment:created', { paymentId: payment.id, amount, type, rideId });
  return payment;
};

const confirmPayment = async (paymentId, userId, options = {}) => {
  return sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({
      where: { id: paymentId },
      include: [{ model: Customer, as: 'customer' }],
      transaction: t,
    });

    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      throw new AppError('Payment not found', 404, 'NOT_FOUND');
    }

    if (payment.status !== 'pending') {
      logger.warn('Invalid payment status', { paymentId, status: payment.status });
      throw new AppError('Invalid payment status', 400, 'INVALID_STATUS');
    }

    if (payment.customer.user_id !== userId) {
      logger.warn('Unauthorized payment confirmation', { paymentId, userId });
      throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    }

    payment.status = 'completed';
    await payment.save({ transaction: t });

    // Update Ride.payment_id if ride_id is present
    if (payment.ride_id) {
      const ride = await Ride.findOne({ where: { id: payment.ride_id }, transaction: t });
      if (ride && !ride.payment_id) {
        ride.payment_id = payment.id;
        await ride.save({ transaction: t });
        logger.info('Ride payment_id updated', { rideId: payment.ride_id, paymentId });
      }
    }

    logger.info('Payment confirmed', { paymentId, userId });
    socketService.emitToUser(userId, 'payment:confirmed', { paymentId, status: payment.status });
    return payment;
  });
};

const authorizePayment = async (userId, amount, type, rideId, metadata = {}, options = {}) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) {
    logger.error('Customer not found', { userId });
    throw new AppError('Customer not found', 404, 'NOT_FOUND');
  }

  if (amount <= 0) {
    logger.warn('Invalid payment amount', { amount });
    throw new AppError('Invalid payment amount', 400, 'INVALID_AMOUNT');
  }

  const payment = await Payment.create(
    {
      customer_id: customer.id,
      ride_id: rideId,
      amount,
      tip_amount: type === 'tip' ? amount : 0,
      status: 'authorized',
      payment_method: metadata.payment_method || 'mobile_money',
      payment_details: { type, ...metadata },
    },
    { transaction: options.transaction }
  );

  logger.info('Payment authorized', { paymentId: payment.id, customerId: customer.id, type, rideId });
  socketService.emitToUser(userId, 'payment:authorized', { paymentId: payment.id, amount, type, rideId });
  return payment;
};

const capturePayment = async (paymentId, userId, options = {}) => {
  const payment = await Payment.findOne({
    where: { id: paymentId },
    include: [{ model: Customer, as: 'customer' }],
    transaction: options.transaction,
  });

  if (!payment) {
    logger.warn('Payment not found', { paymentId });
    throw new AppError('Payment not found', 404, 'NOT_FOUND');
  }

  if (payment.status !== 'authorized') {
    logger.warn('Payment not in authorized state', { paymentId, status: payment.status });
    throw new AppError('Payment not in authorized state', 400, 'INVALID_STATUS');
  }

  if (payment.customer.user_id !== userId) {
    logger.warn('Unauthorized payment capture', { paymentId, userId });
    throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
  }

  payment.status = 'completed';
  await payment.save({ transaction: options.transaction });

  logger.info('Payment captured', { paymentId, userId });
  socketService.emitToUser(userId, 'payment:confirmed', { paymentId, status: payment.status });
  return payment;
};

module.exports = { createPaymentIntent, confirmPayment, authorizePayment, capturePayment };
