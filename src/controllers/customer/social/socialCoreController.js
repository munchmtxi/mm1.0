'use strict';

const { sequelize } = require('@models');
const socialCoreService = require('@services/customer/social/socialCoreService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const socketConstants = require('@constants/common/socketConstants');

module.exports = {
  async manageFriendList(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const { friendId, action } = req.body;
      const result = await socialCoreService.manageFriendList(customerId, friendId, action, transaction);

      const gamificationAction = action === 'add' ? 'friend_request_sent' : action === 'accept' ? 'friend_request_accepted' : null;
      if (gamificationAction) {
        await pointService.awardPoints(customerId, gamificationAction, customerGamificationConstants.GAMIFICATION_ACTIONS.social.find(a => a.action === gamificationAction).points, {
          io: req.io,
          role: 'customer',
          languageCode: req.user.preferred_language,
          walletId: req.user.walletId,
        });
      }

      if (action === 'add' || action === 'accept') {
        await notificationService.sendNotification({
          userId: friendId,
          notificationType: `friend_${action}`,
          messageKey: `social.friend_${action}`,
          messageParams: { inviterId: customerId },
          role: 'customer',
          module: 'social',
        });

        await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES[`SOCIAL_FRIEND_${action.toUpperCase()}`], {
          userId: customerId,
          role: 'customer',
          friendId,
          auditAction: `SOCIAL_FRIEND_${action.toUpperCase()}`,
        }, `customer:${friendId}`);
      }

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: `friend_${action}`,
        details: { friendId, action },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, `friend.${action}`),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Friend list management failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Friend list management failed', 500, 'FRIEND_LIST_FAILED'));
    }
  },

  async setFriendPermissions(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const { friendId, permissions } = req.body;
      const result = await socialCoreService.setFriendPermissions(customerId, friendId, permissions, transaction);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'privacy_settings_updated',
        details: { friendId, permissions },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'permissions.updated'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Friend permissions update failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Permissions update failed', 500, 'PERMISSIONS_UPDATE_FAILED'));
    }
  },

  async facilitateGroupChat(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const { chatId, ...options } = req.body;
      const result = await socialCoreService.facilitateGroupChat(customerId, chatId, options, transaction);

      if (options.message || options.media) {
        await pointService.awardPoints(customerId, 'group_chat_message', customerGamificationConstants.GAMIFICATION_ACTIONS.social.find(a => a.action === 'group_chat_message').points, {
          io: req.io,
          role: 'customer',
          languageCode: req.user.preferred_language,
          walletId: req.user.walletId,
        });

        await notificationService.sendNotification({
          userId: customerId,
          notificationType: 'group_chat_message',
          messageKey: 'social.group_chat_message',
          messageParams: { chatId },
          role: 'customer',
          module: 'social',
        });

        await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.SOCIAL_GROUP_CHAT_MESSAGE, {
          userId: customerId,
          role: 'customer',
          chatId,
          messageId: result.messageId,
          auditAction: 'SOCIAL_GROUP_CHAT_MESSAGE',
        }, `chat:${chatId}`);
      }

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: options.message || options.media ? 'group_chat_message' : 'group_chat_joined',
        details: { chatId, action: options.message || options.media ? 'message' : 'join' },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, options.message || options.media ? 'group_chat.message_sent' : 'group_chat.joined'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Group chat action failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Group chat action failed', 500, 'GROUP_CHAT_FAILED'));
    }
  },
};