// src/controllers/customer/mtables/preOrderController.js
'use strict';

const { validationResult } = require('express-validator');
const preOrderService = require('@services/customer/mtables/preOrderService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const socialConstants = require('@constants/common/socialConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const localizationConstants = require('@constants/common/localizationConstants');

class PreOrderController {
  async createPreOrder(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: formatMessage(
          'customer',
          'mtables',
          req.user.languageCode || localizationConstants.DEFAULT_LANGUAGE,
          mtablesConstants.ERROR_TYPES[0],
          {}
        ),
        errors: errors.array(),
      });
    }

    const { bookingId, items, dietaryPreferences, paymentMethodId, recommendationData } = req.body;
    const { customer_id: userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    try {
      const { order } = await preOrderService.createPreOrder({
        bookingId,
        items,
        dietaryPreferences,
        paymentMethodId,
        recommendationData,
        transaction: req.transaction,
      });

      await auditService.logAction({
        userId,
        role,
        action: mtablesConstants.AUDIT_TYPES.PRE_ORDER_CREATED,
        details: { orderId: order.id, bookingId },
        ipAddress: req.ip,
      });

      await notificationService.sendNotification({
        userId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
        messageKey: 'mtables.pre_order_created',
        messageParams: { orderNumber: order.order_number, amount: order.total_amount },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
        bookingId,
        orderId: order.id,
      });

      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'create_pre_order');
      if (actionConfig) {
        await pointService.awardPoints(userId, 'create_pre_order', actionConfig.points, {
          io: req.io,
          role,
          languageCode,
          walletId: userId,
        });
      }

      await socketService.emit(
        req.io,
        mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
        {
          userId,
          role,
          orderId: order.id,
          orderNumber: order.order_number,
          amount: order.total_amount,
          auditAction: mtablesConstants.AUDIT_TYPES.PRE_ORDER_CREATED,
        },
        `customer:${userId}`,
        languageCode
      );

      return res.status(201).json({
        success: true,
        message: formatMessage(
          'customer',
          'mtables',
          languageCode,
          mtablesConstants.SUCCESS_MESSAGES[11],
          { orderNumber: order.order_number }
        ),
        data: { order },
      });
    } catch (error) {
      logger.logErrorEvent(`Failed to create pre-order: ${error.message}`, { userId, bookingId });
      return res.status(400).json({
        success: false,
        message: formatMessage(
          'customer',
          'mtables',
          languageCode,
          error.message || mtablesConstants.ERROR_TYPES[0],
          {}
        ),
      });
    }
  }

  async sendPreOrderRequestToFriends(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: formatMessage(
          'customer',
          'mtables',
          req.user.languageCode || localizationConstants.DEFAULT_LANGUAGE,
          mtablesConstants.ERROR_TYPES[0],
          {}
        ),
        errors: errors.array(),
      });
    }

    const { bookingId, orderId, amount, billSplitType } = req.body;
    const { customer_id: userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    try {
      const { paymentRequests, order } = await preOrderService.sendPreOrderRequestToFriends({
        bookingId,
        orderId,
        amount,
        billSplitType,
        transaction: req.transaction,
      });

      await auditService.logAction({
        userId,
        role,
        action: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
        details: { orderId, bookingId, billSplitType, totalParticipants: paymentRequests.length + 1 },
        ipAddress: req.ip,
      });

      for (const paymentRequest of paymentRequests) {
        await notificationService.sendNotification({
          userId: paymentRequest.customer_id,
          notificationType: mtablesConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST,
          messageKey: 'mtables.bill_split_request',
          messageParams: { orderNumber: order.order_number, amount: paymentRequest.amount },
          priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[2],
          languageCode,
          bookingId,
          orderId,
        });

        await socketService.emit(
          req.io,
          mtablesConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST,
          {
            userId: paymentRequest.customer_id,
            role,
            orderId,
            amount: paymentRequest.amount,
            reference: paymentRequest.reference,
            auditAction: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
          },
          `customer:${paymentRequest.customer_id}`,
          languageCode
        );
      }

      const actionConfig = customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'initiate_bill_split');
      if (actionConfig) {
        await pointService.awardPoints(userId, 'initiate_bill_split', actionConfig.points, {
          io: req.io,
          role,
          languageCode,
          walletId: userId,
        });
      }

      return res.status(200).json({
        success: true,
        message: formatMessage(
          'customer',
          'mtables',
          languageCode,
          customerWalletConstants.WALLET_CONSTANTS.SUCCESS_MESSAGES[2],
          { orderNumber: order.order_number }
        ),
        data: { paymentRequests, order },
      });
    } catch (error) {
      logger.logErrorEvent(`Failed to send pre-order payment requests: ${error.message}`, { userId, orderId });
      return res.status(400).json({
        success: false,
        message: formatMessage(
          'customer',
          'mtables',
          languageCode,
          error.message || socialConstants.ERROR_CODES[17],
          {}
        ),
      });
    }
  }
}

module.exports = new PreOrderController();