'use strict';

const { sequelize } = require('@models');
const orderService = require('@services/customer/munch/orderService');
const notificationService = require('@services/common/notificationService');
const walletService = require('@services/common/walletService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const browseMerchants = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { latitude, longitude, radiusKm, filters } = req.body;
  const transaction = await sequelize.transaction();
  try {
    const merchants = await orderService.browseMerchants(customerId, { latitude, longitude, radiusKm, filters }, transaction);
    await transaction.commit();
    logger.info('Merchants browsed', { customerId, count: merchants.length });
    res.status(200).json({ status: 'success', data: { merchants } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const addToCart = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { itemId, quantity, customizations } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const cart = await orderService.addToCart(customerId, { itemId, quantity, customizations }, transaction);
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'cart_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await auditService.logAction({
      action: 'ADD_TO_CART',
      userId: customerId,
      role: 'customer',
      details: `Added item to cart: ${itemId}`,
      ipAddress: req.ip,
    }, transaction);
    await socketService.emit(io, 'cart:updated', { cartId: cart.id, customerId }, `customer:${customerId}`);
    await transaction.commit();
    logger.info('Item added to cart', { customerId, cartId: cart.id });
    res.status(200).json({ status: 'success', data: { cartId: cart.id } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateCart = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { cartId, items } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const cart = await orderService.updateCart(customerId, { cartId, items }, transaction);
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'cart_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await auditService.logAction({
      action: 'UPDATE_CART',
      userId: customerId,
      role: 'customer',
      details: `Updated cart: ${cartId}`,
      ipAddress: req.ip,
    }, transaction);
    await socketService.emit(io, 'cart:updated', { cartId, customerId }, `customer:${customerId}`);
    await transaction.commit();
    logger.info('Cart updated', { customerId, cartId });
    res.status(200).json({ status: 'success', data: { cartId } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const placeOrder = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { cartId, branchId, deliveryLocation } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { order, wallet, totalAmount } = await orderService.placeOrder(customerId, { cartId, branchId, deliveryLocation }, transaction);
    await walletService.processTransaction(wallet.id, {
      type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES[1],
      amount: totalAmount,
      currency: order.currency,
    }, transaction);
    await order.update({
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[1],
      payment_status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES[1],
    }, { transaction });
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'order_placed').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_confirmation,
      messageKey: 'order.confirmed',
      messageParams: { orderId: order.id },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    });
    await socketService.emit(io, 'order:confirmed', { orderId: order.id, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[1], customerId }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'PLACE_ORDER',
      userId: customerId,
      role: 'customer',
      details: `Placed order_id: ${order.id}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Order placed', { orderId: order.id, customerId });
    res.status(200).json({ status: 'success', data: { orderId: order.id, totalAmount, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[1] } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const updateOrder = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { orderId, items } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { order, wallet, additionalAmount } = await orderService.updateOrder(orderId, { items }, transaction);
    if (additionalAmount > 0) {
      await walletService.processTransaction(wallet.id, {
        type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES[1],
        amount: additionalAmount,
        currency: order.currency,
      }, transaction);
    }
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'order_updated').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_update,
      messageKey: 'order.updated',
      messageParams: { orderId: order.id },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    });
    await socketService.emit(io, 'order:updated', { orderId: order.id, status: order.status, customerId }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'UPDATE_ORDER',
      userId: customerId,
      role: 'customer',
      details: `Updated order_id: ${orderId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Order updated', { orderId });
    res.status(200).json({ status: 'success', data: { orderId, status: order.status, additionalAmount } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const cancelOrder = catchAsync(async (req, res) => {
  const { customerId } = req.user;
  const { orderId } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const { order, wallet, refundAmount } = await orderService.cancelOrder(orderId, transaction);
    if (refundAmount) {
      await walletService.processTransaction(wallet.id, {
        type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES[2],
        amount: refundAmount,
        currency: order.currency,
      }, transaction);
    }
    await pointService.awardPoints(customerId, gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === 'order_cancellation').action, {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: customerId,
      notificationType: munchConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.order_cancelled,
      messageKey: 'order.cancelled',
      messageParams: { orderId: order.id },
      role: 'customer',
      module: 'munch',
      deliveryMethod: munchConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
    });
    await socketService.emit(io, 'order:cancelled', { orderId: order.id, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6], customerId }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'CANCEL_ORDER',
      userId: customerId,
      role: 'customer',
      details: `Cancelled order_id: ${orderId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    logger.info('Order cancelled', { orderId });
    res.status(200).json({
      status: 'success',
      data: {
        orderId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6],
        refundProcessed: !!refundAmount,
      }
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { browseMerchants, addToCart, updateCart, placeOrder, updateOrder, cancelOrder };