'use strict';

const { sequelize } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Middleware for social module-specific checks.
 */
module.exports = {
  async checkPostOwnership(req, res, next) {
    try {
      const { customerId } = req.user;
      const { postId } = req.body;
      const post = await sequelize.models.Post.findOne({ where: { postId, customerId } });
      if (!post) {
        throw new AppError('Post not found or not owned by user', 403, 'POST_NOT_OWNED');
      }
      next();
    } catch (error) {
      logger.logErrorEvent('Post ownership check failed', { error: error.message, customerId: req.user.customerId });
      next(error);
    }
  },

  async checkFriendExists(req, res, next) {
    try {
      const { friendId } = req.body;
      const friend = await sequelize.models.Customer.findByPk(friendId);
      if (!friend) {
        throw new AppError('Friend not found', 404, 'FRIEND_NOT_FOUND');
      }
      next();
    } catch (error) {
      logger.logErrorEvent('Friend existence check failed', { error: error.message, customerId: req.user.customerId });
      next(error);
    }
  },

  async checkChatPermissions(req, res, next) {
    try {
      const { customerId } = req.user;
      const { chatId } = req.body;
      const chatMember = await sequelize.models.ChatMember.findOne({ where: { chatId, customerId } });
      if (!chatMember) {
        throw new AppError('User not a member of this chat', 403, 'CHAT_ACCESS_DENIED');
      }
      next();
    } catch (error) {
      logger.logErrorEvent('Chat permissions check failed', { error: error.message, customerId: req.user.customerId });
      next(error);
    }
  },

  async checkEventAccess(req, res, next) {
    try {
      const { customerId } = req.user;
      const { eventId } = req.body;
      const event = await sequelize.models.Event.findOne({ where: { eventId, customerId } });
      if (!event) {
        throw new AppError('Event not found or not accessible', 403, 'EVENT_ACCESS_DENIED');
      }
      next();
    } catch (error) {
      logger.logErrorEvent('Event access check failed', { error: error.message, customerId: req.user.customerId });
      next(error);
    }
  },
};