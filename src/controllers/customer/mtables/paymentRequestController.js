// src/controllers/customer/mtables/paymentRequestController.js
'use strict';

const { Sequelize } = require('sequelize');
const paymentRequestService = require('@services/customer/paymentRequestService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const socialConstants = require('@constants/common/socialConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');

class PaymentRequestController {
  async sendPaymentRequest(req, res, next) {
    const { bookingId, amount, billSplitType } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user || {};
    const ipAddress = req.ip;

    try {
      if (role !== 'customer') {
        throw new Error(customerConstants.ERROR_CODES[2]); // PERMISSION_DENIED
      }

      const transaction = await Sequelize.transaction();
      try {
        const result = await paymentRequestService.sendPaymentRequest({
          bookingId,
          amount,
          billSplitType,
          transaction,
        });

        await transaction.commit();

        await auditService.logAction({
          userId,
          role,
          action: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
          details: { bookingId, amount, billSplitType },
          ipAddress,
        });

        await pointService.awardPoints(userId, customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'bill_split_initiated').action, 10, {
          io: req.io,
          role,
          languageCode,
        });

        await socketService.emit(req.io, 'BILL_SPLIT_REQUEST_SENT', {
          userId,
          role,
          bookingId,
          amount,
          billSplitType,
          auditAction: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
        }, `customer:${userId}`, languageCode);

        const message = formatMessage('customer', 'notifications', languageCode, 'payment_request_sent', {
          amount,
          bookingId,
        });

        res.status(200).json({
          success: true,
          data: result.paymentRequests,
          message,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.logErrorEvent(`Failed to send payment request: ${error.message}`, { userId, bookingId });
      next({
        status: 400,
        message: formatMessage('customer', 'errors', languageCode, error.message, {}),
        errorCode: error.message,
      });
    }
  }

  async sendPreOrderPaymentRequest(req, res, next) {
    const { bookingId, orderId, amount, billSplitType } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user || {};
    const ipAddress = req.ip;

    try {
      if (role !== 'customer') {
        throw new Error(customerConstants.ERROR_CODES[2]); // PERMISSION_DENIED
      }

      const transaction = await Sequelize.transaction();
      try {
        const result = await paymentRequestService.sendPreOrderPaymentRequest({
          bookingId,
          orderId,
          amount,
          billSplitType,
          transaction,
        });

        await transaction.commit();

        await auditService.logAction({
          userId,
          role,
          action: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
          details: { bookingId, orderId, amount, billSplitType },
          ipAddress,
        });

        await pointService.awardPoints(userId, customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'bill_split_initiated').action, 15, {
          io: req.io,
          role,
          languageCode,
        });

        await socketService.emit(req.io, 'PRE_ORDER_BILL_SPLIT_REQUEST_SENT', {
          userId,
          role,
          bookingId,
          orderId,
          amount,
          billSplitType,
          auditAction: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
        }, `customer:${userId}`, languageCode);

        const message = formatMessage('customer', 'notifications', languageCode, 'pre_order_payment_request_sent', {
          amount,
          orderId,
        });

        res.status(200).json({
          success: true,
          data: { paymentRequests: result.paymentRequests, order: result.order },
          message,
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.logErrorEvent(`Failed to send pre-order payment request: ${error.message}`, { userId, bookingId, orderId });
      next({
        status: 400,
        message: formatMessage('customer', 'errors', languageCode, error.message, {}),
        errorCode: error.message,
      });
    }
  }
}

module.exports = new PaymentRequestController();