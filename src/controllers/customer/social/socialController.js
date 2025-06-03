'use strict';

const { sequelize } = require('@models');
const {
  manageFriendList,
  setFriendPermissions,
  facilitateGroupChat,
} = require('@services/customer/social/socialCoreService');
const {
  createPost,
  managePostReactions,
  shareStory,
  inviteFriendToService,
  splitBill,
} = require('@services/customer/social/socialContentService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const customerConstants = require('@constants/customerConstants');
const socialEvents = require('@socket/events/customer/social/socialEvents');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const manageFriendListAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { friendId, action } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await manageFriendList(customerId, friendId, action, transaction);
    if (['add', 'accept'].includes(action)) {
      await pointService.awardPoints(customerId, action === 'add' ? 'friend_request' : 'friend_accept', {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
      await notificationService.sendNotification({
        {
          userId: friendId,
          notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.friend_request,
          messageKey: action === 'add' ? 'friend_request' : 'friend_accepted',
          messageParams: { userName: req.user.getFullName() },
          deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
          priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
          role: 'customer',
          module: 'social',
        }, transaction);
    }
    if (action === 'accept') {
      await socketService.emit(io, socialEvents.FRIEND_ACCEPTED', { customerId, status: 'accepted' }, `customer:${friendId}`);
    } else if (['remove', 'block'].includes(action)) {
      await socketService.emit(io, socialEvents[`FRIEND_${action.toUpperCase()}`], { customerId }, `customer:${friendId}`);
    }
    await auditService.logAction({
      action: `FRIEND_${action.toUpperCase()}`,
      userId: customerId,
      role: 'customer',
      details: `Friend ${action} for ${friendId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const setFriendPermissionsAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { friendId, permissions } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await setFriendPermissions(customerId, friendId, permissions, transaction);
    await notificationService.sendNotification({
      userId: friendId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.friend_request,
      messageKey: 'permissions_updated',
      messageParams: { userName: req.user.getFullName() },
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      role: 'customer',
      module: 'social',
    }, transaction);
    await socketService.emit(io, socialEvents.FRIEND_PERMISSIONS, { customerId, permissions }, `friend:${friendId}`);
    await auditService.logAction({
      action: 'SET_FRIEND_PERMISSIONS',
      userId: customerId,
      role: 'customer',
      details: `Permissions set for friend ${friendId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const facilitateGroupChatAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { chatId } = req.params;
  const { message, media, pinned, serviceType, serviceId } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await facilitateGroupChat(customerId, chatId, { message, media, pinned, serviceType, serviceId }, transaction);
    if (result.status === 'joined') {
      await pointService.awardPoints(customerId, 'join_group_chat', {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
      await notificationService.sendNotification({
        userId: (await GroupChat.findByPk(chatId, { transaction })).creator_id,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GROUP_CHAT_INVITE,
        messageKey: 'chat_joined',
        messageParams: { userName: req.user.getFullName(), chatName: (await GroupChat.findByPk(chatId, { transaction })).name },
        deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
        role: 'customer',
        module: 'social',
      }, transaction);
      await socketService.emit(io, socialEvents.CHAT_JOYED, { customerId, chatName: (await GroupChat.findByPk(chatId, { transaction })).name }, `chat:${chatId}`);
    } else {
      await pointService.awardPoints(customerId, 'send_chat_message', {
        io,
        role: 'customer',
        languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
      }, transaction);
      await notificationService.sendNotification({
        userId: null,
        notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.GROUP_CHAT_MESSAGE,
        messageKey: 'chat_message',
        messageParams: { userName: req.user.getFullName(), chatName: (await GroupChat.findByPk(chatId, { transaction })).name },
        deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
        role: 'customer',
        module: 'social',
        broadcast: (await GroupChat.findByPk(chatId, { include: ['members'], transaction })).members
          .map(m => m.id)
          .filter(id => id !== customerId),
      }, transaction);
      await socketService.emit(io, socialEvents.CHAT_MESSAGE, {
        messageId: result.messageId,
        senderId: customerId,
        content: message,
        media,
        pinned,
        serviceType,
        serviceId,
      }, `chat:${chatId}`);
    }
    await auditService.logAction({
      action: message || media ? 'SEND_CHAT_MESSAGE' : 'JOIN_GROUP_CHAT',
      userId: customerId,
      role: 'customer',
      details: `Chat action for ${chatId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const createPostAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { content, media, privacy, serviceType, serviceId } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await createPost(customerId, { content, media, privacy, serviceType, serviceId }, transaction);
    await pointService.awardPoints(customerId, 'create_post', {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: null,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SOCIAL,
      messageKey: 'post_created',
      messageParams: { userName: req.user.getFullName(), serviceType: serviceType || 'general' },
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      role: 'customer',
      module: 'social',
      broadcast: privacy === 'friends' ? (await sequelize.models.UserConnections.findAll({
        where: { user_id: customerId, status: 'accepted' },
        transaction,
      })).map(c => c.friend_id) : [],
    }, transaction);
    await socketService.emit(io, socialEvents.POST_CREATED, {
      postId: result.postId,
      content,
      media,
      privacy,
      serviceType,
      serviceId,
      createdAt: result.createdAt,
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'CREATE_POST',
      userId: customerId,
      role: 'customer',
      details: `Post created for ${serviceType || 'general'}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const managePostReactionsAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { postId } = req.params;
  const { reaction } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await managePostReactions(customerId, postId, reaction, transaction);
    await pointService.awardPoints(customerId, 'react_post', {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: (await Post.findByPk(postId, { transaction })).user_id,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SOCIAL,
      messageKey: 'post_reacted',
      messageParams: { userName: req.user.getFullName(), reaction },
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      role: 'customer',
      module: 'social',
    }, transaction);
    await socketService.emit(io, socialEvents.POST_REACTION, {
      reactionId: result.reactionId,
      postId,
      reaction,
      senderId: customerId,
    }, `customer:${(await Post.findByPk(postId, { transaction })).user_id}`);
    await auditService.logAction({
      action: 'REACT_POST',
      userId: customerId,
      role: 'customer',
      details: `Reacted to post ${postId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const shareStoryAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { media, serviceType, serviceId } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await shareStory(customerId, { media, serviceType, serviceId }, transaction);
    await pointService.awardPoints(customerId, 'share_story', {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: null,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SOCIAL,
      messageKey: 'story_shared',
      messageParams: { userName: req.user.getFullName(), serviceType: serviceType || 'general' },
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.LOW,
      role: 'customer',
      module: 'social',
      broadcast: (await sequelize.models.UserConnections.findAll({
        where: { user_id: customerId, status: 'accepted' },
        transaction,
      })).map(c => c.friend_id),
    }, transaction);
    await socketService.emit(io, socialEvents.STORY_SHARED, {
      storyId: result.storyId,
      media,
      serviceType,
      serviceId,
      expiresAt: result.expiresAt,
    }, `customer:${customerId}`);
    await auditService.logAction({
      action: 'SHARE_STORY',
      userId: customerId,
      role: 'customer',
      details: `Story shared for ${serviceType || 'general'}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const inviteFriendToServiceAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { friendId, serviceType, serviceId, method } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await inviteFriendToService(customerId, { friendId, serviceType, serviceId, method }, transaction);
    await pointService.awardPoints(customerId, 'invite_friend', {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: friendId,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SERVICE_INVITE,
      messageKey: `${serviceType}_invite`,
      messageParams: { userName: req.user.getFullName(), serviceId },
      deliveryMethod: method === 'app' ? customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH : method,
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      role: 'customer',
      module: 'social',
    }, transaction);
    await socketService.emit(io, socialEvents.SERVICE_INVITED, {
      inviteId: result.inviteId,
      friendId,
      serviceType,
      serviceId,
      method,
      status: result.status,
    }, `customer:${friendId}`);
    await auditService.logAction({
      action: 'INVITE_FRIEND',
      userId: customerId,
      role: 'customer',
      details: `Invited friend ${friendId} to ${serviceType} ${serviceId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const splitBillAction = catchAsync(async (req, res) => {
  const { id: customerId } = req.user;
  const { serviceType, serviceId, splitType, participants, amounts } = req.body;
  const io = req.app.get('socketio');
  const transaction = await sequelize.transaction();
  try {
    const result = await splitBill(customerId, { serviceType, serviceId, splitType, participants, amounts }, transaction);
    await pointService.awardPoints(customerId, 'split_payment', {
      io,
      role: 'customer',
      languageCode: req.user.preferred_language || customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
    }, transaction);
    await notificationService.sendNotification({
      userId: null,
      notificationType: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.SOCIAL,
      messageKey: 'bill_split_initiated',
      messageParams: { userName: req.user.getFullName(), serviceType, serviceId },
      deliveryMethod: customerConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
      priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.MEDIUM,
      role: 'customer',
      module: 'social',
      broadcast: participants,
    }, transaction);
    await socketService.emit(io, socialEvents.BILL_SPLIT, {
      billSplitId: result.billSplitId,
      serviceType,
      serviceId,
      splitType,
      splits: result.splits,
      status: result.status,
    }, participants.map(p => `customer:${p}`));
    await auditService.logAction({
      action: 'SPLIT_BILL',
      userId: customerId,
      role: 'customer',
      details: `Bill split initiated for ${serviceType} ${serviceId}`,
      ipAddress: req.ip,
    }, transaction);
    await transaction.commit();
    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = {
  manageFriendListAction,
  setFriendPermissionsAction,
  facilitateGroupChatAction,
  createPostAction,
  managePostReactionsAction,
  shareStoryAction,
  inviteFriendToServiceAction,
  splitBillAction,
};