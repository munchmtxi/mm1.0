'use strict';

const { sequelize } = require('@models');
const cartService = require('@services/customer/mtables/cartService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

const controller = {
  async addToCart(req, res, next) {
    const { io } = req;
    const { customerId, branchId, items } = req.body;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { cart, cartItems } = await cartService.addToCart({ customerId, branchId, items, transaction });

      await pointService.awardPoints(
        customerId,
        gamificationConstants.GAMIFICATION_ACTIONS[2].action, // pre_order_placed
        gamificationConstants.GAMIFICATION_ACTIONS[2].points,
        { io, role: 'customer', languageCode, walletId: req.user.wallet_id }
      );

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'notifications.cart.added',
        messageParams: { cartId: cart.id },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(
        io,
        customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        {
          userId: customerId,
          role: 'customer',
          auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
          details: { cartId: cart.id, branchId, itemCount: items.length },
        },
        `customer:${customerId}`,
        languageCode
      );

      await auditService.logAction(
        {
          userId: customerId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
          details: { cartId: cart.id, branchId, itemCount: items.length },
          ipAddress: req.ip,
        },
        transaction
      );

      await transaction.commit();
      return res.status(201).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'cart.added', { cartId: cart.id }),
        data: { cart, cartItems },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to add to cart', { error: error.message, customerId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[0]));
    }
  },

  async updateCart(req, res, next) {
    const { io } = req;
    const { cartId, items } = req.body;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { cart, cartItems } = await cartService.updateCart({ customerId, cartId, items, transaction });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'notifications.cart.updated',
        messageParams: { cartId },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(
        io,
        customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[2],
        {
          userId: customerId,
          role: 'customer',
          auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[1],
          details: { cartId, itemCount: items.length },
        },
        `customer:${customerId}`,
        languageCode
      );

      await auditService.logAction(
        {
          userId: customerId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[1],
          details: { cartId, itemCount: items.length },
          ipAddress: req.ip,
        },
        transaction
      );

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'cart.updated', { cartId }),
        data: { cart, cartItems },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to update cart', { error: error.message, cartId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[7]));
    }
  },

  async clearCart(req, res, next) {
    const { io } = req;
    const { cartId } = req.params;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { cart } = await cartService.clearCart({ customerId, cartId, transaction });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        messageKey: 'notifications.cart.cleared',
        messageParams: { cartId },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
      });

      await socketService.emit(
        io,
        customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0],
        {
          userId: customerId,
          role: 'customer',
          auditAction: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2],
          details: { cartId },
        },
        `customer:${customerId}`,
        languageCode
      );

      await auditService.logAction(
        {
          userId: customerId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2],
          details: { cartId },
          ipAddress: req.ip,
        },
        transaction
      );

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'cart.cleared', { cartId }),
        data: { cart },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to clear cart', { error: error.message, cartId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[7]));
    }
  },

  async getCart(req, res, next) {
    const { cartId } = req.params;
    const customerId = req.user.id;
    const languageCode = req.user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    let transaction;
    try {
      transaction = await sequelize.transaction();
      const { cart } = await cartService.getCart({ customerId, cartId, transaction });

      await auditService.logAction(
        {
          userId: customerId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[6],
          details: { cartId },
          ipAddress: req.ip,
        },
        transaction
      );

      await transaction.commit();
      return res.status(200).json({
        success: true,
        message: formatMessage('customer', 'notifications', languageCode, 'cart.retrieved', { cartId }),
        data: { cart },
      });
    } catch (error) {
      if (transaction) await transaction.rollback();
      logger.logErrorEvent('Failed to retrieve cart', { error: error.message, cartId });
      return next(new AppError(error.message, 400, mtablesConstants.ERROR_TYPES[22]));
    }
  },
};

module.exports = controller;