'use strict';

const { sequelize, User, Customer, Post, PostReaction, Story, Booking, Order, Ride, Event } = require('@models');
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

async function createPost(customerId, postData, transaction) {
  const { content, media, privacy, serviceType, serviceId } = postData;

  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  const postType = media ? media.type : (serviceType ? serviceType : 'text');
  if (!socialConstants.SOCIAL_SETTINGS.POST_TYPES.includes(postType)) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_post'),
      400,
      socialConstants.ERROR_CODES[9]
    );
  }
  if (!socialConstants.SOCIAL_SETTINGS.POST_PRIVACY.includes(privacy)) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_post'),
      400,
      socialConstants.ERROR_CODES[9]
    );
  }
  if (content && content.length > socialConstants.SOCIAL_SETTINGS.MAX_POST_LENGTH) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_post'),
      400,
      socialConstants.ERROR_CODES[9]
    );
  }
  if (media && (media.urls.length > socialConstants.SOCIAL_SETTINGS.MAX_MEDIA_FILES || media.urls.some(url => typeof url !== 'string'))) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_post'),
      400,
      socialConstants.ERROR_CODES[9]
    );
  }

  let service;
  if (serviceType && serviceId) {
    switch (serviceType) {
      case 'booking':
        service = await Booking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['confirmed', 'completed'].includes(service.status)) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'order':
        service = await Order.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['delivered', 'completed'].includes(service.status)) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'ride':
        service = await Ride.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || service.status !== 'completed') {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'event':
        service = await Event.findByPk(serviceId, { transaction });
        if (!service || service.organizer_id !== customerId || !['confirmed', 'completed'].includes(service.status)) {
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

  const post = await Post.create({
    user_id: customerId,
    content,
    media: media ? { type: media.type, urls: media.urls } : null,
    privacy,
    service_type: serviceType || null,
    service_id: serviceId || null,
    created_at: new Date(),
  }, { transaction });

  logger.info('Post created', { customerId, postId: post.id });
  return { postId: post.id, content, media: post.media, privacy, serviceType, serviceId, createdAt: post.created_at };
}

async function managePostReactions(customerId, postId, reaction, transaction) {
  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  const post = await Post.findByPk(postId, { transaction });
  if (!post) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_post'),
      400,
      socialConstants.ERROR_CODES[9]
    );
  }

  if (post.privacy === 'friends') {
    const connection = await sequelize.models.UserConnections.findOne({
      where: { user_id: post.user_id, friend_id: customerId, status: 'accepted' },
      transaction,
    });
    if (!connection) {
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.unauthorized'),
        403,
        socialConstants.ERROR_CODES[13]
      );
    }
  }

  if (!socialConstants.SOCIAL_SETTINGS.REACTION_TYPES.includes(reaction)) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_reaction'),
      400,
      socialConstants.ERROR_CODES[10]
    );
  }

  const existingReaction = await PostReaction.findOne({
    where: { post_id: postId, user_id: customerId },
    transaction,
  });
  if (existingReaction) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.already_reacted'),
      400,
      socialConstants.ERROR_CODES[14]
    );
  }

  const reactionRecord = await PostReaction.create({
    post_id: postId,
    user_id: customerId,
    reaction,
    created_at: new Date(),
  }, { transaction });

  logger.info('Post reaction processed', { customerId, postId, reaction });
  return { reactionId: reactionRecord.id, postId, reaction };
}

async function shareStory(customerId, storyData, transaction) {
  const { media, serviceType, serviceId } = storyData;

  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  if (!socialConstants.SOCIAL_SETTINGS.STORY_TYPES.includes(media.type) || !media.url || typeof media.url !== 'string') {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_story'),
      400,
      socialConstants.ERROR_CODES[11]
    );
  }

  let service;
  if (serviceType && serviceId) {
    switch (serviceType) {
      case 'booking':
        service = await Booking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['confirmed', 'completed'].includes(service.status)) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'order':
        service = await Order.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['delivered', 'completed'].includes(service.status)) {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'ride':
        service = await Ride.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || service.status !== 'completed') {
          throw new AppError(
            formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
            400,
            socialConstants.ERROR_CODES[18]
          );
        }
        break;
      case 'event':
        service = await Event.findByPk(serviceId, { transaction });
        if (!service || service.organizer_id !== customerId || !['confirmed', 'completed'].includes(service.status)) {
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

  const story = await Story.create({
    user_id: customerId,
    media: { type: media.type, url: media.url },
    service_type: serviceType || null,
    service_id: serviceId || null,
    expires_at: new Date(Date.now() + socialConstants.SOCIAL_SETTINGS.STORY_DURATION_HOURS * 3600000),
    created_at: new Date(),
  }, { transaction });

  logger.info('Story shared', { customerId, storyId: story.id });
  return { storyId: story.id, media: story.media, serviceType, serviceId, expiresAt: story.expires_at };
}

async function inviteFriendToService(customerId, inviteData, transaction) {
  const { friendId, serviceType, serviceId, method } = inviteData;

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

  if (!socialConstants.SOCIAL_SETTINGS.INVITE_METHODS.includes(method)) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_invite'),
      400,
      socialConstants.ERROR_CODES[15]
    );
  }

  let service, maxFriends;
  switch (serviceType) {
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['pending', 'confirmed'].includes(service.status)) {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxFriends = mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING;
      break;
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['pending', 'confirmed'].includes(service.status)) {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxFriends = munchConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_ORDER;
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['pending', 'accepted'].includes(service.status)) {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxFriends = rideConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_RIDE;
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { transaction });
      if (!service || service.organizer_id !== customerId || !['draft', 'confirmed'].includes(service.status)) {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxFriends = meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS;
      break;
    default:
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_action'),
        400,
        socialConstants.ERROR_CODES[2]
      );
  }

  const inviteCount = await sequelize.models.ServiceInvite.count({
    where: { service_type: serviceType, service_id: serviceId },
    transaction,
  });
  if (inviteCount >= maxFriends) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.max_friends_exceeded'),
      400,
      socialConstants.ERROR_CODES[16]
    );
  }

  const existingInvite = await sequelize.models.ServiceInvite.findOne({
    where: { service_type: serviceType, service_id: serviceId, friend_id: friendId },
    transaction,
  });
  if (existingInvite) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_invite'),
      400,
      socialConstants.ERROR_CODES[15]
    );
  }

  const invite = await sequelize.models.ServiceInvite.create({
    customer_id: customerId,
    friend_id: friendId,
    service_type: serviceType,
    service_id: serviceId,
    method,
    status: 'invited',
    created_at: new Date(),
  }, { transaction });

  logger.info('Friend invited to service', { customerId, friendId, serviceType, serviceId });
  return { inviteId: invite.id, friendId, serviceType, serviceId, method, status: invite.status };
}

async function splitBill(customerId, billData, transaction) {
  const { serviceType, serviceId, splitType, participants, amounts } = billData;

  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'),
      400,
      socialConstants.ERROR_CODES[0]
    );
  }

  if (!socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(splitType)) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_bill_split'),
      400,
      socialConstants.ERROR_CODES[17]
    );
  }

  let service, maxParticipants, amount;
  switch (serviceType) {
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || service.status !== 'confirmed') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxParticipants = mtablesConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS;
      amount = service.total_amount;
      break;
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || service.status !== 'delivered') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxParticipants = munchConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS;
      amount = service.total_amount;
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || service.status !== 'completed') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxParticipants = rideConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS;
      amount = service.fare;
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { transaction });
      if (!service || service.organizer_id !== customerId || service.status !== 'confirmed') {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service'),
          400,
          socialConstants.ERROR_CODES[18]
        );
      }
      maxParticipants = meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS;
      amount = service.total_cost;
      break;
    default:
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_action'),
        400,
        socialConstants.ERROR_CODES[2]
      );
  }

  if (participants.length > maxParticipants) {
    throw new AppError(
      formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.max_friends_exceeded'),
      400,
      socialConstants.ERROR_CODES[16]
    );
  }

  for (const participantId of participants) {
    const participant = await User.findByPk(participantId, { include: ['customer_profile'], transaction });
    if (!participant || !participant.customer_profile) {
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_friend'),
        400,
        socialConstants.ERROR_CODES[1]
      );
    }
    const invite = await sequelize.models.ServiceInvite.findOne({
      where: { service_type: serviceType, service_id: serviceId, friend_id: participantId, status: 'accepted' },
      transaction,
    });
    if (!invite) {
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_invite'),
        400,
        socialConstants.ERROR_CODES[15]
      );
    }
  }

  let splits = [];
  if (splitType === 'equal') {
    const share = amount / participants.length;
    splits = participants.map(p => ({ userId: p, amount: share }));
  } else if (splitType === 'custom') {
    let total = 0;
    splits = [];
    for (const p of participants) {
      const share = amounts[p];
      if (!share || share <= 0) {
        throw new AppError(
          formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_bill_split'),
          400,
          socialConstants.ERROR_CODES[17]
        );
      }
      total += share;
      splits.push({ userId: p, amount: share });
    }
    if (Math.abs(total - amount) > 0.01) {
      throw new AppError(
        formatMessage('customer', 'social', customerConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_bill_split'),
        400,
        socialConstants.ERROR_CODES[17]
      );
    }
  } else if (splitType === 'itemized') {
    splits = participants.map(p => ({ userId: p, amount: amounts[p] }));
  }

  const billSplit = await sequelize.models.BillSplit.create({
    service_type: serviceType,
    service_id: serviceId,
    initiator_id: customerId,
    split_type: splitType,
    total_amount: amount,
    splits,
    status: 'pending',
    created_at: new Date(),
  }, { transaction });

  logger.info('Bill split activated', { customerId, serviceType, serviceId });
  return { billSplitId: billSplit.id, serviceType, serviceId, splitType, splits, status: billSplit.status };
}

module.exports = {
  createPost,
  managePostReactions,
  shareStory,
  inviteFriendToService,
  splitBill,
};