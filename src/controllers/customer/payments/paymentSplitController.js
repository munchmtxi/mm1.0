'use strict';

const { sequelize } = require('@models');
const { splitPayment, manageSplitPaymentRefunds } = require('@services/customer/payments/paymentSplitService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const createSplitPayment = catchAsync(async (req, res) => {
  const { serviceId, serviceType, payments } = req.body;
  const { id: customerId } = req.user;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await splitPayment(serviceId, serviceType, payments, transaction);
    for (const payment of result.splitPayments) {
      await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'split_payment').action, {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
      await notificationService.sendNotification({
        userId: payment.customerId,
        notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'split_payment_processed',
        messageParams: { serviceType, orderId: serviceId, amount: payment.amount, currency: 'USD' },
        role: 'customer',
        module: 'payments',
        deliveryMethod: paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
      }, transaction);
      await socketService.emit(io, 'payment:split', {
        serviceId,
        serviceType,
        paymentId: payment.paymentId,
        amount: payment.amount,
        currency: 'USD',
        status: paymentConstants.TRANSACTION_STATUSES[1],
        customerId: payment.customerId,
      }, `payment:split:${payment.customerId}`);
    }
    await auditService.logAction({
      action: 'SPLIT_PAYMENT',
      userId: customerId,
      role: 'customer',
      details: `Processed split payment for ${serviceType} #${serviceId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Split payment created', { customerId, serviceId, serviceType });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const processSplitPaymentRefunds = catchAsync(async (req, res) => {
  const { serviceId, serviceType, refunds } = req.body;
  const { id: customerId } = req.user;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await manageSplitPaymentRefunds(serviceId, serviceType, refunds, transaction);
    for (const refund of result.refunds) {
      await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'payment_refunded').action, {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
      await notificationService.sendNotification({
        userId: refund.customerId,
        notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1],
        messageKey: 'split_payment_refunded',
        messageParams: { serviceType, orderId: serviceId, amount: refund.amount, currency: 'USD' },
        role: 'customer',
        module: 'payments',
        deliveryMethod: paymentConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
      }, transaction);
      await socketService.emit(io, 'payment:refund', {
        serviceId,
        serviceType,
        amount: refund.amount,
        currency: 'USD',
        status: paymentConstants.TRANSACTION_STATUSES[3],
        customerId: refund.customerId,
      }, `payment:refund:${refund.customerId}`);
    }
    await auditService.logAction({
      action: 'SPLIT_PAYMENT_REFUNDED',
      userId: customerId,
      role: 'customer',
      details: `Processed refunds for ${serviceType} #${serviceId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Split payment refunds processed', { customerId, serviceId, serviceType });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { createSplitPayment, processSplitPaymentRefunds };