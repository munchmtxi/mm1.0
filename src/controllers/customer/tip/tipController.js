'use strict';

const tipService = require('@services/common/tipService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization');
const customerConstants = require('@constants/customer/customerConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const tipConstants = require('@constants/common/tipConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const socketConstants = require('@constants/common/socketConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = {
  createTip: async (req, res, next) => {
    const { customerId, recipientId, amount, currency, rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId } = req.body;
    const { io, user } = req;
    const languageCode = user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    try {
      if (!user || user.id !== customerId || user.role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'tip', languageCode, 'error.invalid_customer'),
          401,
          customerConstants.ERROR_CODES.UNAUTHORIZED
        );
      }

      const tip = await sequelize.transaction(async (transaction) => {
        const tipResult = await tipService.createTip(customerId, recipientId, amount, currency, { rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId }, transaction);

        // Award points
        const serviceType = Object.keys({ rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId }).find(key => req.body[key]);
        const action = `tip_${serviceType.replace('Id', '')}`;
        await pointService.awardPoints(customerId, action, customerGamificationConstants.GAMIFICATION_ACTIONS.tip.find(a => a.action === action).points, {
          io,
          role: 'customer',
          languageCode,
          walletId: tipResult.walletId,
        });

        // Log audit
        await auditService.logAction({
          userId: customerId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TIP_CREATED,
          details: { tipId: tipResult.tipId, recipientId, amount, currency, serviceType },
          ipAddress: req.ip,
        }, transaction);

        // Notify recipient
        await notificationService.sendNotification({
          userId: recipientId,
          notificationType: 'tip_received',
          messageKey: 'tip.received',
          messageParams: { amount, currency, customerId },
          role: 'notifications',
          module: 'tip',
          languageCode,
        });

        // Emit socket event
        await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.TIP_RECEIVED, {
          userId: recipientId,
          role: 'driver', // Adjust based on recipient role in real implementation
          tipId: tipResult.tipId,
          amount,
          currency,
          serviceType,
        }, `recipient:${recipientId}`, languageCode);

        return tipResult;
      });

      logger.logApiEvent('Tip created', { tipId: tip.tipId, customerId });
      res.status(201).json({
        status: 'success',
        message: formatMessage('customer', 'tip', languageCode, 'success.tip_created', { amount, currency }),
        data: tip,
      });
    } catch (error) {
      logger.logErrorEvent('Tip creation failed', { customerId, error: error.message });
      next(error instanceof AppError ? error : new AppError(
        formatMessage('customer', 'tip', languageCode, 'error.tip_creation_failed'),
        500,
        tipConstants.ERROR_CODES.TIP_ACTION_FAILED
      ));
    }
  },

  updateTip: async (req, res, next) => {
    const { tipId } = req.params;
    const { customerId, amount, status } = req.body;
    const { io, user } = req;
    const languageCode = user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    try {
      if (!user || user.id !== customerId || user.role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'tip', languageCode, 'error.invalid_customer'),
          401,
          customerConstants.ERROR_CODES.UNAUTHORIZED
        );
      }

      const tip = await sequelize.transaction(async (transaction) => {
        const tipResult = await tipService.updateTip(tipId, customerId, { amount, status }, transaction);

        // Log audit
        await auditService.logAction({
          userId: customerId,
          role: 'customer',
          action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TIP_UPDATED,
          details: { tipId, updates: { amount, status } },
          ipAddress: req.ip,
        }, transaction);

        // Notify recipient if status changed
        if (status) {
          await notificationService.sendNotification({
            userId: tipResult.recipientId,
            notificationType: 'tip_updated',
            messageKey: 'tip.updated',
            messageParams: { tipId, status },
            role: 'notifications',
            module: 'tip',
            languageCode,
          });

          // Emit socket event
          await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.TIP_UPDATED, {
            userId: tipResult.recipientId,
            role: 'driver', // Adjust based on recipient role
            tipId,
            status,
          }, `recipient:${tipResult.recipientId}`, languageCode);
        }

        return tipResult;
      });

      logger.logApiEvent('Tip updated', { tipId, customerId });
      res.status(200).json({
        status: 'success',
        message: formatMessage('customer', 'tip', languageCode, 'success.tip_updated'),
        data: tip,
      });
    } catch (error) {
      logger.logErrorEvent('Tip update failed', { tipId, customerId, error: error.message });
      next(error instanceof AppError ? error : new AppError(
        formatMessage('customer', 'tip', languageCode, 'error.tip_update_failed'),
        500,
        tipConstants.ERROR_CODES.TIP_ACTION_FAILED
      ));
    }
  },

  getCustomerTips: async (req, res, next) => {
    const { customerId } = req.params;
    const { user } = req;
    const languageCode = user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE;

    try {
      if (!user || user.id !== customerId || user.role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'tip', languageCode, 'error.invalid_customer'),
          401,
          customerConstants.ERROR_CODES.UNAUTHORIZED
        );
      }

      const tips = await tipService.getCustomerTips(customerId);

      // Log audit
      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.TIP_HISTORY_VIEWED,
        details: { customerId, tipCount: tips.length },
        ipAddress: req.ip,
      });

      logger.logApiEvent('Customer tips retrieved', { customerId, count: tips.length });
      res.status(200).json({
        status: 'success',
        message: formatMessage('customer', 'tip', languageCode, 'success.tips_retrieved'),
        data: tips,
      });
    } catch (error) {
      logger.logErrorEvent('Customer tips retrieval failed', { customerId, error: error.message });
      next(error instanceof AppError ? error : new AppError(
        formatMessage('customer', 'tip', languageCode, 'error.tips_retrieval_failed'),
        500,
        tipConstants.ERROR_CODES.TIP_ACTION_FAILED
      ));
    }
  },
};