'use strict';

const { sequelize, User, Customer, UserConnections, FriendPermissions, GroupChat, GroupChatMessage } = require('@models');
const socialConstants = require('@constants/customer/social/socialConstants');
const customerConstants = require('@constants/customerConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const rideConstants = require('@constants/common/rideConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const { formatMessage } = require('@utils/localization');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function manageFriendList(customerId, friendId, action, transaction) {
  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  const friend = await User.findByPk(friendId, { include: ['customer_profile'], transaction });
  if (!friend || !friend.customer_profile || customerId === friendId) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_friend'),
      400,
      socialConstants.ERROR_CODES[1]
    );
  }

  if (!socialConstants.SOCIAL_SETTINGS.FRIEND_ACTIONS.includes(action)) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_action'),
      400,
      socialConstants.ERROR_CODES[2]
    );
  }

  let connection = await UserConnections.findOne({ where: { user_id: customerId, friend_id: friendId }, transaction });
  const reverseConnection = await UserConnections.findOne({ where: { user_id: friendId, friend_id: customerId }, transaction });

  let result;
  switch (action) {
    case 'add':
      if (connection || reverseConnection) {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.pending_request'),
          400,
          socialConstants.ERROR_CODES[3]
        );
      }
      connection = await UserConnections.create({
        user_id: customerId,
        friend_id: friendId,
        status: 'pending',
        created_at: new Date(),
      }, { transaction });
      result = { status: 'pending', friendId };
      break;
    case 'accept':
      if (!reverseConnection || reverseConnection.status !== 'pending') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.pending_request'),
          400,
          socialConstants.ERROR_CODES[3]
        );
      }
      reverseConnection.status = 'accepted';
      reverseConnection.accepted_at = new Date();
      await reverseConnection.save({ transaction });
      connection = await UserConnections.create({
        user_id: customerId,
        friend_id: friendId,
        status: 'accepted',
        accepted_at: new Date(),
      }, { transaction });
      await FriendPermissions.create({
        user_id: customerId,
        friend_id: friendId,
        permissions: socialConstants.SOCIAL_SETTINGS.PERMISSION_TYPES.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
      }, { transaction });
      await FriendPermissions.create({
        user_id: friendId,
        friend_id: customerId,
        permissions: socialConstants.SOCIAL_SETTINGS.PERMISSION_TYPES.reduce((acc, p) => ({ ...acc, [p]: true }), {}),
      }, { transaction });
      result = { status: 'accepted', friendId };
      break;
    case 'reject':
      if (!reverseConnection || reverseConnection.status !== 'pending') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.pending_request'),
          400,
          socialConstants.ERROR_CODES[3]
        );
      }
      reverseConnection.status = 'rejected';
      await reverseConnection.save({ transaction });
      result = { status: 'rejected', friendId };
      break;
    case 'remove':
      if (!connection || connection.status !== 'accepted') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.not_friend'),
          400,
          socialConstants.ERROR_CODES[4]
        );
      }
      await connection.destroy({ transaction });
      if (reverseConnection) await reverseConnection.destroy({ transaction });
      await FriendPermissions.destroy({ where: { user_id: customerId, friend_id: friendId }, transaction });
      await FriendPermissions.destroy({ where: { user_id: friendId, friend_id: customerId }, transaction });
      result = { status: 'removed', friendId };
      break;
    case 'block':
      if (connection) {
        connection.status = 'blocked';
        await connection.save({ transaction });
      } else {
        connection = await UserConnections.create({
          user_id: customerId,
          friend_id: friendId,
          status: 'blocked',
          created_at: new Date(),
        }, { transaction });
      }
      if (reverseConnection) await reverseConnection.destroy({ transaction });
      await FriendPermissions.destroy({ where: { user_id: customerId, friend_id: friendId }, transaction });
      await FriendPermissions.destroy({ where: { user_id: friendId, friend_id: customerId }, transaction });
      result = { status: 'blocked', friendId };
      break;
  }

  logger.info('Friend list action processed', { customerId, friendId, action });
  return result;
}

async function setFriendPermissions(customerId, friendId, permissions, transaction) {
  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  const friend = await User.findByPk(friendId, { include: ['customer_profile'], transaction });
  if (!friend || !friend.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_friend'),
      400,
      socialConstants.ERROR_CODES[1]
    );
  }

  const connection = await UserConnections.findOne({
    where: { user_id: customerId, friend_id: friendId, status: 'accepted' },
    transaction,
  });
  if (!connection) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.not_friend'),
      400,
      socialConstants.ERROR_CODES[4]
    );
  }

  const validPermissions = socialConstants.SOCIAL_SETTINGS.PERMISSION_TYPES;
  const invalidPerms = Object.keys(permissions).filter(key => !validPermissions.includes(key));
  if (invalidPerms.length) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_permissions'),
      400,
      socialConstants.ERROR_CODES[5]
    );
  }

  const updatedPermissions = validPermissions.reduce((acc, perm) => ({
    ...acc,
    [perm]: permissions[perm] !== undefined ? !!permissions[perm] : false,
  }), {});

  let permissionRecord = await FriendPermissions.findOne({
    where: { user_id: customerId, friend_id: friendId },
    transaction,
  });
  if (permissionRecord) {
    permissionRecord.permissions = updatedPermissions;
    await permissionRecord.save({ transaction });
  } else {
    permissionRecord = await FriendPermissions.create({
      user_id: customerId,
      friend_id: friendId,
      permissions: updatedPermissions,
      created_at: new Date(),
    }, { transaction });
  }

  logger.info('Friend permissions updated', { customerId, friendId });
  return { friendId, permissions: updatedPermissions };
}

async function facilitateGroupChat(customerId, chatId, options, transaction) {
  const { message, media, pinned, serviceType, serviceId } = options;

  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  const chat = await GroupChat.findByPk(chatId, { include: [{ model: User, as: 'members' }], transaction });
  if (!chat || chat.status !== 'active') {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_chat'),
      400,
      socialConstants.ERROR_CODES[6]
    );
  }

  if (serviceType && serviceId) {
    let service;
    switch (serviceType) {
      case 'booking':
        service = await sequelize.models.Booking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'order':
        service = await sequelize.models.Order.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'ride':
        service = await sequelize.models.Ride.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'event':
        service = await sequelize.models.Event.findByPk(serviceId, { transaction });
        if (!service || service.organizer_id !== customerId) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      default:
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_action'),
          400,
          socialConstants.ERROR_CODES[2]
        );
    }
  }

  const isMember = chat.members.some(m => m.id === customerId);
  let result;

  if (!isMember && !message && !media) {
    if (chat.members.length >= socialConstants.SOCIAL_SETTINGS.GROUP_CHAT_SETTINGS.MAX_PARTICIPANTS) {
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.chat_limit_exceeded'),
        400,
        socialConstants.ERROR_CODES[11]
      );
    }
    await sequelize.models.GroupChatMembers.create({
      chat_id: chatId,
      user_id: customerId,
      role: 'member',
      created_at: new Date(),
    }, { transaction });
    result = { chatId, status: 'joined', serviceType, serviceId };
  } else if (isMember && (message || media)) {
    const messageCount = await GroupChatMessage.count({
      where: { chat_id: chatId, sender_id: customerId, created_at: { [Op.gte]: new Date(Date.now() - 3600000) } },
      transaction,
    });
    if (messageCount >= socialConstants.SOCIAL_SETTINGS.GROUP_CHAT_SETTINGS.MAX_MESSAGES_PER_HOUR) {
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.chat_limit_exceeded'),
        400,
        socialConstants.ERROR_CODES[11]
      );
    }
    const messageRecord = await GroupChatMessage.create({
      chat_id: chatId,
      sender_id: customerId,
      content: message || null,
      media: media || null,
      pinned: !!pinned,
      service_type: serviceType || null,
      service_id: serviceId || null,
      created_at: new Date(),
    }, { transaction });
    result = { chatId, messageId: messageRecord.id, content: message, media, pinned: messageRecord.pinned, serviceType, serviceId };
  } else {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_action'),
      400,
      socialConstants.ERROR_CODES[2]
    );
  }

  logger.info('Group chat action processed', { customerId, chatId, action: message || media ? 'message' : 'join' });
  return result;
}

module.exports = {
  manageFriendList,
  setFriendPermissions,
  facilitateGroupChat,
};