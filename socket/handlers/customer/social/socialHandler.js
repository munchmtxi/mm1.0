'use strict';

const socialEvents = require('@socket/events/customer/social/socialEvents');
const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

const handleFriendRequest = (io, data) => {
  const { customerId, status, friendId } = data;
  socketService.emit(io, socialEvents.FRIEND_REQUEST, { customerId, status }, `customer:${friendId}`);
  logger.info('Friend request emitted', { customerId, friendId });
};

const handleFriendAccepted = (io, data) => {
  const { customerId, status, friendId } = data;
  socketService.emit(io, socialEvents.FRIEND_ACCEPTED, { customerId, status }, `customer:${friendId}`);
  logger.info('Friend accepted emitted', { customerId, friendId });
};

const handleFriendRejected = (io, data) => {
  const { customerId, friendId } = data;
  socketService.emit(io, socialEvents.FRIEND_REJECTED, { customerId }, `customer:${friendId}`);
  logger.info('Friend rejected emitted', { customerId, friendId });
};

const handleFriendRemoved = (io, data) => {
  const { customerId, friendId } = data;
  socketService.emit(io, socialEvents.FRIEND_REMOVED, { customerId }, `customer:${friendId}`);
  logger.info('Friend removed emitted', { customerId, friendId });
};

const handleFriendBlocked = (io, data) => {
  const { customerId, friendId } = data;
  socketService.emit(io, socialEvents.FRIEND_BLOCKED, { customerId }, `customer:${friendId}`);
  logger.info('Friend blocked emitted', { customerId, friendId });
};

const handleFriendPermissions = (io, data) => {
  const { customerId, permissions, friendId } = data;
  socketService.emit(io, socialEvents.FRIEND_PERMISSIONS, { customerId, permissions }, `friend:${friendId}`);
  logger.info('Friend permissions emitted', { customerId, friendId });
};

const handleChatJoined = (io, data) => {
  const { customerId, chatName, chatId } = data;
  socketService.emit(io, socialEvents.CHAT_JOINED, { customerId, chatName }, `chat:${chatId}`);
  logger.info('Chat joined emitted', { customerId, chatId });
};

const handleChatMessage = (io, data) => {
  const { messageId, senderId, content, media, pinned, serviceType, serviceId, chatId } = data;
  socketService.emit(io, socialEvents.CHAT_MESSAGE, {
    messageId,
    senderId,
    content,
    media,
    pinned,
    serviceType,
    serviceId,
  }, `chat:${chatId}`);
  logger.info('Chat message emitted', { senderId, chatId, messageId });
};

const handlePostCreated = (io, data) => {
  const { postId, content, media, privacy, serviceType, serviceId, createdAt, customerId } = data;
  socketService.emit(io, socialEvents.POST_CREATED, {
    postId,
    content,
    media,
    privacy,
    serviceType,
    serviceId,
    createdAt,
  }, `customer:${customerId}`);
  logger.info('Post created emitted', { customerId, postId });
};

const handlePostReaction = (io, data) => {
  const { reactionId, postId, reaction, senderId, postOwnerId } = data;
  socketService.emit(io, socialEvents.POST_REACTION, {
    reactionId,
    postId,
    reaction,
    senderId,
  }, `customer:${postOwnerId}`);
  logger.info('Post reaction emitted', { senderId, postId });
};

const handleStoryShared = (io, data) => {
  const { storyId, media, serviceType, serviceId, expiresAt, customerId } = data;
  socketService.emit(io, socialEvents.STORY_SHARED, {
    storyId,
    media,
    serviceType,
    serviceId,
    expiresAt,
  }, `customer:${customerId}`);
  logger.info('Story shared emitted', { customerId, storyId });
};

const handleServiceInvited = (io, data) => {
  const { inviteId, friendId, serviceType, serviceId, method, status } = data;
  socketService.emit(io, socialEvents.SERVICE_INVITED, {
    inviteId,
    friendId,
    serviceType,
    serviceId,
    method,
    status,
  }, `customer:${friendId}`);
  logger.info('Service invite emitted', { friendId, serviceType, serviceId });
};

const handleBillSplit = (io, data) => {
  const { billSplitId, serviceType, serviceId, splitType, splits, status, participants } = data;
  participants.forEach(participantId => {
    socketService.emit(io, socialEvents.BILL_SPLIT, {
      billSplitId,
      serviceType,
      serviceId,
      splitType,
      splits,
      status,
    }, `customer:${participantId}`);
  });
  logger.info('Bill split emitted', { billSplitId, serviceType, serviceId });
};

module.exports = {
  handleFriendRequest,
  handleFriendAccepted,
  handleFriendRejected,
  handleFriendRemoved,
  handleFriendBlocked,
  handleFriendPermissions,
  handleChatJoined,
  handleChatMessage,
  handlePostCreated,
  handlePostReaction,
  handleStoryShared,
  handleServiceInvited,
  handleBillSplit,
};