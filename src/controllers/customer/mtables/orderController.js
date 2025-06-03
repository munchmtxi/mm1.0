'use strict';

const { sequelize } = require('@models');
const {
  addToCart,
  createOrder,
  updateOrder,
  cancelOrder,
  trackOrderStatus,
  submitOrderFeedback,
} = require('@services/customer/mtables/orderService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const walletService = require('@services/common/walletService');
const { formatMessage } = require('@utils/localization/localization');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const { Customer, Payment } = require('@models');

const addToCart = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { branchId, items } = req.body;
  const ipAddress = req.ip;

  logger.info('Adding to cart', { customerId, branchId });

  const transaction = await sequelize.transaction();
  try {
    const cart = await addToCart({ customerId, branchId, items, transaction });

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.CART_UPDATED || 'cart:updated',
        details: { cartId: cart.id, branchId, itemCount: items.length },
        ipAddress,
      },
      transaction
    );

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Cart updated') || 'Cart updated',
      data: { cartId: cart.id },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Cart update failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'CART_UPDATE_FAILED') || 'CART_UPDATE_FAILED'));
  }
});

const createOrder = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { bookingId, items, isPreOrder, cartId, dietaryPreferences, paymentMethodId, recommendationData } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Creating order', { customerId, bookingId });

  const transaction = await sequelize.transaction();
  try {
    const order = await createOrder({
      bookingId,
      items,
      isPreOrder,
      cartId,
      dietaryPreferences,
      paymentMethodId,
      recommendationData,
      transaction,
    });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: isPreOrder ? 'order.pre_order.created' : 'order.created',
      params: { orderId: order.id, totalAmount: order.total_amount },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_confirmation,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_CREATED || 'order:created',
        details: { orderId: order.id, bookingId, isPreOrder, totalAmount: order.total_amount },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'order:created', {
      userId: customer.user_id,
      role: 'customer',
      orderId: order.id,
      orderNumber: order.order_number,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(
        a => a.action === 'order_created'
      ) || { action: 'order_created', points: 20 };
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points || 20,
          metadata: { io, role: 'customer', orderId: order.id },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === (isPreOrder ? 'Pre-order created' : 'Order created')) || (isPreOrder ? 'Pre-order created' : 'Order created'),
      data: { orderId: order.id, orderNumber: order.order_number, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Order creation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_CREATION_FAILED') || 'ORDER_CREATION_FAILED'));
  }
});

const updateOrder = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { orderId, items, dietaryPreferences } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Updating order', { customerId, orderId });

  const transaction = await sequelize.transaction();
  try {
    const order = await updateOrder({ orderId, items, dietaryPreferences, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'order.updated',
      params: { orderId: order.id, totalAmount: order.total_amount },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_confirmation,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_UPDATED || 'order:updated',
        details: { orderId, totalAmount: order.total_amount },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'order:updated', {
      userId: customer.user_id,
      role: 'customer',
      orderId,
      totalAmount: order.total_amount,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Order updated') || 'Order updated',
      data: { orderId: order.id, totalAmount: order.total_amount },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Order update failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_UPDATE_FAILED') || 'ORDER_UPDATE_FAILED'));
  }
});

const cancelOrder = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { orderId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('io');

  logger.info('Cancelling order', { customerId, orderId });

  const transaction = await sequelize.transaction();
  try {
    const order = await InDiningOrder.findByPk(orderId, { transaction });
    if (order.payment_status === 'completed') {
      const customer = await Customer.findByPk(order.customer_id, { transaction });
      const wallet = await sequelize.models.Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
      if (wallet) {
        const payment = await Payment.findOne({ where: { order_id: order.id }, transaction });
        if (payment) {
          await walletService.processRefund(
            order.id,
            {
              walletId: wallet.id,
              transactionId: payment.transaction_id,
              type: 'order',
            },
            transaction
          );
        }
      }
    }

    const updatedOrder = await cancelOrder({ orderId, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'order.cancelled',
      params: { orderId },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_confirmation,
        message,
        priority: 'MEDIUM',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_CANCELLED || 'order:cancelled',
        details: { orderId },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'order:cancelled', {
      userId: customer.user_id,
      role: 'customer',
      orderId,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Order cancelled') || 'Order cancelled',
      data: { orderId: updatedOrder.id },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Order cancellation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_CANCELLATION_FAILED') || 'ORDER_CANCELLATION_FAILED'));
  }
});

const trackOrderStatus = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { orderId } = req.params;
  const io = req.app.get('io');

  logger.info('Tracking order status', { customerId, orderId });

  const transaction = await sequelize.transaction();
  try {
    const status = await trackOrderStatus({ orderId, transaction });

    await socketService.emit(io, 'order:status', {
      userId: req.user.user_id,
      role: 'customer',
      orderId,
      status: status.status,
      preparationStatus: status.preparationStatus,
    });

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Order status tracked') || 'Order status tracked',
      data: status,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Order status tracking failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'ORDER_STATUS_TRACKING_FAILED') || 'ORDER_STATUS_TRACKING_FAILED'));
  }
});

const submitOrderFeedback = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { orderId, rating, comment, staffId } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Submitting order feedback', { customerId, orderId });

  const transaction = await sequelize.transaction();
  try {
    const feedback = await submitOrderFeedback({ orderId, rating, comment, staffId, transaction });

    const customer = await Customer.findByPk(customerId, { transaction });

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT,
      messageKey: 'feedback.submitted',
      params: { orderId, rating: 10 },
    });
    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.feedback_confirmation,
        message,
        priority: 'LOW',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT,
      },
      { transaction }
    );

    await auditService.logAction(
      {
        userId: customerId,
        logType: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.FEEDBACK_SUBMITTED || 'feedback:submitted',
        details: { orderId, rating, staffId },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'feedback:submitted', {
      userId: customer.user_id,
      role: 'customer',
      orderId,
      rating,
    });

    try {
      const action = customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(
        a => a.action === 'feedback_submitted'
      ) || { action: 'feedback_submitted', points: 5 };
      await gamificationService.awardPoints(
        {
          userId: customer.user_id,
          action: action.action,
          points: action.points || 5,
          metadata: { io, role: 'customer', orderId },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: mtablesConstants.SUCCESS_MESSAGES.find(m => m === 'Feedback submitted') || 'Feedback submitted',
      data: { feedbackId: feedback.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Feedback submission failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, mtablesConstants.ERROR_CODES.find(c => c === 'FEEDBACK_SUBMISSION_FAILED') || 'FEEDBACK_SUBMISSION_FAILED'));
  }
});

module.exports = {
  addToCart,
  createOrder,
  updateOrder,
  cancelOrder,
  trackOrderStatus,
  submitOrderFeedback,
};