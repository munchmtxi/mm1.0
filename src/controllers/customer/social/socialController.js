'use strict';

const { sequelize } = require('@models');
const socialService = require('@services/customer/social/socialService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const locationService = require('@services/common/locationService');
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
      const result = await socialService.manageFriendList(customerId, friendId, action, transaction);

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
      const result = await socialService.setFriendPermissions(customerId, friendId, permissions, transaction);

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
      const result = await socialService.facilitateGroupChat(customerId, chatId, options, transaction);

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

  async createLiveEventStream(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const { eventId, ...streamData } = req.body;
      const stream = await socialService.createLiveEventStream(customerId, eventId, streamData, transaction);

      await pointService.awardPoints(customerId, 'event_live_update_shared', customerGamificationConstants.GAMIFICATION_ACTIONS.mevents.find(a => a.action === 'event_live_update_shared').points, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: 'live_stream_created',
        messageKey: 'social.live_stream_created',
        messageParams: { title: stream.title },
        role: 'customer',
        module: 'social',
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.SOCIAL_LIVE_STREAM_CREATED, {
        userId: customerId,
        role: 'customer',
        streamId: stream.streamId,
        eventId,
        auditAction: 'SOCIAL_LIVE_STREAM_CREATED',
      }, `customer:${customerId}`);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'event_live_update_shared',
        details: { streamId: stream.streamId, eventId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(201).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'live_stream.created'),
        data: stream,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Live stream creation failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Live stream creation failed', 500, 'LIVE_STREAM_FAILED'));
    }
  },

  async manageSocialRecommendations(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const preferences = req.body;
      const recommendations = await socialService.manageSocialRecommendations(customerId, preferences, transaction);

      await pointService.awardPoints(customerId, 'recommendations_received', customerGamificationConstants.GAMIFICATION_ACTIONS.analytics.find(a => a.action === 'recommendations_received').points, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        walletId: req.user.walletId,
      });

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'recommendations_received',
        details: { preferences },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'recommendations.received'),
        data: recommendations,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Social recommendations failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Social recommendations failed', 500, 'RECOMMENDATIONS_FAILED'));
    }
  },
};