'use strict';

const { sequelize } = require('@models');
const {
  Order,
  Customer,
  Wallet,
  MerchantBranch,
  Merchant,
} = require('@models');
const orderService = require('@services/customer/orderService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const socketConstants = require('@constants/common/socketConstants');

/**
 * Browse merchants based on location and filters
 */
exports.browseMerchants = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { latitude, longitude, radiusKm, filters = {} } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const merchants = await orderService.browseMerchants(customerId, { latitude, longitude, radiusKm, filters }, transaction);

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.BROWSE_MERCHANTS,
      details: { latitude, longitude, radiusKm, filters },
      ipAddress: req.ip,
    }, transaction);

    await transaction.commit();
    res.status(200).json({
      success: true,
      data: merchants,
      message: formatMessage('customer', 'order', languageCode, 'merchant_browse_success'),
    });
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Browse merchants failed', { error: error.message, userId: req.user.id });
    next(new AppError(
      formatMessage('customer', 'order', req.user.preferred_language, 'merchant_browse_failed', { error: error.message }),
      error.statusCode || 500,
      error.errorCode || customerConstants.ERROR_CODES.ORDER_FAILED
    ));
  }
};

/**
 * Add item to cart
 */
exports.addToCart = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { itemId, quantity, customizations } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const cart = await orderService.addToCart(customerId, { itemId, quantity, customizations }, transaction);

    const addToCartAction = customerGamificationConstants.GAMIFICATION_ACTIONS.munch.find(
      action => action.action === 'add_to_cart'
    );

    await pointService.awardPoints(
      customerId,
      addToCartAction.action,
      addToCartAction.points,
      {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: (await Wallet.findOne({ where: { user_id: customerId }, transaction })).id,
      }
    );

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ADD_TO_CART,
      details: { itemId, quantity, customizations },
      ipAddress: req.ip,
    }, transaction);

    await transaction.commit();
    res.status(200).json({
      success: true,
      data: cart,
      message: formatMessage('customer', 'order', languageCode, 'add_to_cart_success'),
    });
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Add to cart failed', { error: error.message, userId: req.user.id });
    next(new AppError(
      formatMessage('customer', 'order', req.user.preferred_language, 'add_to_cart_failed', { error: error.message }),
      error.statusCode || 500,
      error.errorCode || customerConstants.ERROR_CODES.ORDER_FAILED
    ));
  }
};

/**
 * Update cart items
 */
exports.updateCart = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { cartId, items } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const cart = await orderService.updateCart(customerId, { cartId, items }, transaction);

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.UPDATE_CART,
      details: { cartId, items },
      ipAddress: req.ip,
    }, transaction);

    await transaction.commit();
    res.status(200).json({
      success: true,
      data: cart,
      message: formatMessage('customer', 'order', languageCode, 'update_cart_success'),
    });
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Update cart failed', { error: error.message, userId: req.user.id });
    next(new AppError(
      formatMessage('customer', 'order', req.user.preferred_language, 'update_cart_failed', { error: error.message }),
      error.statusCode || 500,
      error.errorCode || customerConstants.ERROR_CODES.ORDER_FAILED
    ));
  }
};

/**
 * Place an order
 */
exports.placeOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { cartId, branchId, deliveryLocation } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    // Validate delivery location
    const resolvedLocation = await locationService.resolveLocation(deliveryLocation, customerId, null, 'customer', languageCode);

    const { order, wallet, totalAmount } = await orderService.placeOrder(
      customerId,
      { cartId, branchId, deliveryLocation: resolvedLocation },
      transaction
    );

    const branch = await MerchantBranch.findByPk(branchId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });

    const orderPlacedAction = customerGamificationConstants.GAMIFICATION_ACTIONS.munch.find(
      action => action.action === 'order_placed'
    );

    await pointService.awardPoints(
      customerId,
      orderPlacedAction.action,
      orderPlacedAction.points,
      {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: wallet.id,
      }
    );

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // order_placed
      messageKey: 'order.order_placed',
      messageParams: { orderNumber: order.order_number, totalAmount },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
      role: 'customer',
      module: 'order',
      orderId: order.id,
      merchantId: branch.merchant_id,
    });

    await socketService.emit(
      req.io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE,
      {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_PLACED,
        details: { orderId: order.id, orderNumber: order.order_number, totalAmount },
        order,
      },
      `merchant:${branch.merchant_id}`,
      languageCode
    );

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_PLACED,
      details: { orderId: order.id, cartId, branchId, totalAmount },
      ipAddress: req.ip,
    }, transaction);

    await transaction.commit();
    res.status(201).json({
      success: true,
      data: { order, walletBalance: wallet.balance },
      message: formatMessage('customer', 'order', languageCode, 'order_placed_success', { orderNumber: order.order_number }),
    });
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Place order failed', { error: error.message, userId: req.user.id });
    next(new AppError(
      formatMessage('customer', 'order', req.user.preferred_language, 'order_placed_failed', { error: error.message }),
      error.statusCode || 500,
      error.errorCode || customerConstants.ERROR_CODES.ORDER_FAILED
    ));
  }
};

/**
 * Update an existing order
 */
exports.updateOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId, updates } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const { order, wallet, additionalAmount } = await orderService.updateOrder(orderId, updates, transaction);

    const branch = await MerchantBranch.findByPk(order.branch_id, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1], // order_updated
      messageKey: 'order.order_updated',
      messageParams: { orderNumber: order.order_number, additionalAmount },
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
      role: 'customer',
      module: 'order',
      orderId: order.id,
      merchantId: branch.merchant_id,
    });

    await socketService.emit(
      req.io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE,
      {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_UPDATED,
        details: { orderId, updates, additionalAmount },
        order,
      },
      `merchant:${branch.merchant_id}`,
      languageCode
    );

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_UPDATED,
      details: { orderId, updates, additionalAmount },
      ipAddress: req.ip,
    }, transaction);

    await transaction.commit();
    res.status(200).json({
      success: true,
      data: { order, walletBalance: wallet.balance, additionalAmount },
      message: formatMessage('customer', 'order', languageCode, 'order_updated_success', { orderNumber: order.order_number }),
    });
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Update order failed', { error: error.message, userId: req.user.id });
    next(new AppError(
      formatMessage('customer', 'order', req.user.preferred_language, 'order_updated_failed', { error: error.message }),
      error.statusCode || 500,
      error.errorCode || customerConstants.ERROR_CODES.ORDER_FAILED
    ));
  }
};

/**
 * Cancel an order
 */
exports.cancelOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const { orderId } = req.params;
    const customerId = req.user.id;
    const languageCode = req.user.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    const { order, wallet, refundAmount, refundProcessed } = await orderService.cancelOrder(orderId, transaction);

    const branch = await MerchantBranch.findByPk(order.branch_id, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });

    if (refundProcessed) {
      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2], // order_cancelled
        messageKey: 'order.order_cancelled',
        messageParams: { orderNumber: order.order_number, refundAmount },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        role: 'customer',
        module: 'order',
        orderId: order.id,
        merchantId: branch.merchant_id,
      });
    }

    await socketService.emit(
      req.io,
      socketConstants.SOCKET_EVENT_TYPES.CUSTOMER_ORDER_UPDATE,
      {
        userId: customerId,
        role: 'customer',
        auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_CANCELLED,
        details: { orderId, refundAmount, refundProcessed },
        order,
      },
      `merchant:${branch.merchant_id}`,
      languageCode
    );

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.ORDER_CANCELLED,
      details: { orderId, refundAmount, refundProcessed },
      ipAddress: req.ip,
    }, transaction);

    await transaction.commit();
    res.status(200).json({
      success: true,
      data: { order, walletBalance: wallet?.balance, refundAmount, refundProcessed },
      message: formatMessage('customer', 'order', languageCode, 'order_cancelled_success', { orderNumber: order.order_number }),
    });
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Cancel order failed', { error: error.message, userId: req.user.id });
    next(new AppError(
      formatMessage('customer', 'order', req.user.preferred_language, 'order_cancelled_failed', { error: error.message }),
      error.statusCode || 500,
      error.errorCode || customerConstants.ERROR_CODES.ORDER_FAILED
    ));
  }
};

module.exports = exports;