'use strict';

const { sequelize } = require('@models');
const socialContentService = require('@services/customer/social/socialContentService');
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
  async createPost(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const postData = req.body;
      const post = await socialContentService.createPost(customerId, postData, transaction);

      await pointService.awardPoints(customerId, 'social_post_shared', customerGamificationConstants.GAMIFICATION_ACTIONS.social.find(a => a.action === 'social_post_shared').points, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: 'post_created',
        messageKey: 'social.post_created',
        messageParams: { content: postData.content?.substring(0, 50) },
        role: 'customer',
        module: 'social',
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.SOCIAL_POST_CREATED, {
        userId: customerId,
        role: 'customer',
        postId: post.postId,
        auditAction: 'SOCIAL_POST_CREATED',
      }, `customer:${customerId}`);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'social_post_shared',
        details: { postId: post.postId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(201).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'post.created'),
        data: post,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Post creation failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Post creation failed', 500, 'POST_CREATION_FAILED'));
    }
  },

  async managePostReactions(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const { postId, reaction } = req.body;
      const reactionData = await socialContentService.managePostReactions(customerId, postId, reaction, transaction);

      await pointService.awardPoints(customerId, 'review_upvoted', customerGamificationConstants.GAMIFICATION_ACTIONS.reviews.find(a => a.action === 'review_upvoted').points, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: 'post_reaction',
        messageKey: 'social.post_reacted',
        messageParams: { reaction },
        role: 'customer',
        module: 'social',
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.SOCIAL_POST_REACTION, {
        userId: customerId,
        role: 'customer',
        postId,
        reaction,
        auditAction: 'SOCIAL_POST_REACTION',
      }, `customer:${customerId}`);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'review_upvoted',
        details: { postId, reaction },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(200).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'reaction.added'),
        data: reactionData,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Reaction management failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Reaction management failed', 500, 'REACTION_MANAGEMENT_FAILED'));
    }
  },

  async shareStory(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const storyData = req.body;
      const story = await socialContentService.shareStory(customerId, storyData, transaction);

      await pointService.awardPoints(customerId, 'social_post_shared', customerGamificationConstants.GAMIFICATION_ACTIONS.social.find(a => a.action === 'social_post_shared').points, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: customerId,
        notificationType: 'story_shared',
        messageKey: 'social.story_shared',
        messageParams: { mediaType: storyData.media.type },
        role: 'customer',
        module: 'social',
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.SOCIAL_STORY_SHARED, {
        userId: customerId,
        role: 'customer',
        storyId: story.storyId,
        auditAction: 'SOCIAL_STORY_SHARED',
      }, `customer:${customerId}`);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'social_post_shared',
        details: { storyId: story.storyId },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(201).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'story.created'),
        data: story,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Story sharing failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Story sharing failed', 500, 'STORY_SHARING_FAILED'));
    }
  },

  async inviteFriendToService(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { customerId } = req.user;
      const inviteData = req.body;
      const invite = await socialContentService.inviteFriendToService(customerId, inviteData, transaction);

      await pointService.awardPoints(customerId, 'party_member_invited', customerGamificationConstants.GAMIFICATION_ACTIONS.mtables.find(a => a.action === 'party_member_invited').points, {
        io: req.io,
        role: 'customer',
        languageCode: req.user.preferred_language,
        walletId: req.user.walletId,
      });

      await notificationService.sendNotification({
        userId: invite.friendId,
        notificationType: 'service_invite',
        messageKey: 'social.service_invite',
        messageParams: { serviceType: invite.serviceType, inviterId: customerId },
        role: 'customer',
        module: 'social',
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.SOCIAL_INVITE_SENT, {
        userId: customerId,
        role: 'customer',
        friendId: invite.friendId,
        serviceType: invite.serviceType,
        serviceId: invite.serviceId,
        auditAction: 'SOCIAL_INVITE_SENT',
      }, `customer:${invite.friendId}`);

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: 'party_member_invited',
        details: { inviteId: invite.inviteId, serviceType: invite.serviceType },
        ipAddress: req.ip,
      }, transaction);

      await transaction.commit();
      res.status(201).json({
        message: formatMessage('customer', 'social', req.user.preferred_language, 'invite.sent'),
        data: invite,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Friend invite failed', { error: error.message, customerId: req.user.customerId });
      next(error instanceof AppError ? error : new AppError('Friend invite failed', 500, 'INVITE_FAILED'));
    }
  },
};