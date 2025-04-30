'use strict';

const { Payment, Customer } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const submitTip = async (
  userId,
  serviceId,
  amount,
  recipientId,
  serviceType = 'RIDE',
  paymentMethod = 'CREDIT_CARD',
  taxRate = 0.15,
  options = {}
) => {
  try {
    if (!userId || !serviceId || !recipientId) {
      logger.warn('Missing required input parameters', { userId, serviceId, recipientId, serviceType });
      throw new AppError('All required IDs (user, service, recipient) must be provided', 400, 'INVALID_INPUT');
    }
    if (amount <= 0) {
      logger.warn('Invalid tip amount', { amount });
      throw new AppError('Tip amount must be positive', 400, 'INVALID_INPUT');
    }

    const customer = await Customer.findOne({ where: { user_id: userId }, transaction: options.transaction });
    if (!customer) {
      logger.error('Customer not found', { userId });
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const totalAmount = Math.round(amount * (1 + taxRate));

    const payment = await Payment.create(
      {
        customer_id: customer.id,
        ride_id: serviceType === 'RIDE' ? serviceId : null,
        order_id: serviceType === 'FOOD_DELIVERY' ? serviceId : null,
        subscription_id: serviceType === 'SUBSCRIPTION' ? serviceId : null,
        driver_id: serviceType === 'RIDE' ? recipientId : null,
        delivery_agent_id: serviceType === 'FOOD_DELIVERY' ? recipientId : null,
        amount: totalAmount,
        tip_amount: totalAmount,
        payment_method: paymentMethod,
        payment_details: { type: 'tip' },
        type: 'tip',
        status: 'completed',
        tip_allocation: serviceType === 'RIDE' ? { driver_id: recipientId, amount: totalAmount } : null,
      },
      { transaction: options.transaction }
    );

    logger.info('Tip payment processed successfully', {
      paymentId: payment.id,
      serviceId,
      serviceType,
      userId,
      recipientId,
      amount: totalAmount,
      paymentMethod,
    });
    return payment;
  } catch (error) {
    logger.error('Failed to process tip payment', {
      error: error.message,
      serviceId,
      serviceType,
      userId,
      recipientId,
    });
    throw error instanceof AppError ? error : new AppError('Failed to process tip payment', 500, 'PAYMENT_ERROR');
  }
};

module.exports = { submitTip };