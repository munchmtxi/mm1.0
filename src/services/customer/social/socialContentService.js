'use strict';

const { sequelize, User, Post, PostReaction, Story, Booking, Order, Ride, Event, ParkingBooking, ServiceInvite } = require('@models');
const socialConstants = require('@constants/customer/social/socialConstants');
const customerConstants = require('@constants/customerConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const munchConstants = require('@constants/common/munchConstants');
const rideConstants = require('@constants/common/rideConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const { Op } = require('sequelize');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function createPost(customerId, postData, transaction) {
  const { content, media, privacy, serviceType, serviceId } = postData;

  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const postType = media ? media.type : (serviceType ? serviceType : 'text');
  if (!socialConstants.SOCIAL_SETTINGS.POST_TYPES.includes(postType)) {
    throw new AppError('Invalid post', 400, socialConstants.ERROR_CODES[9]);
  }
  if (!socialConstants.SOCIAL_SETTINGS.POST_PRIVACY.includes(privacy)) {
    throw new AppError('Invalid post', 400, socialConstants.ERROR_CODES[9]);
  }
  if (content && content.length > socialConstants.SOCIAL_SETTINGS.MAX_POST_LENGTH) {
    throw new AppError('Invalid post', 400, socialConstants.ERROR_CODES[9]);
  }
  if (media && (media.urls.length > socialConstants.SOCIAL_SETTINGS.MAX_MEDIA_FILES || media.urls.some(url => typeof url !== 'string'))) {
    throw new AppError('Invalid post', 400, socialConstants.ERROR_CODES[9]);
  }

  let service;
  if (serviceType && serviceId) {
    switch (serviceType) {
      case 'booking':
        service = await Booking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['approved', 'seated', 'completed'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'order':
        service = await Order.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['completed', 'delivered'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'ride':
        service = await Ride.findByPk(serviceId, { transaction });
        if (!service || service.customerId !== customerId || service.status !== 'COMPLETED') {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'event':
        service = await Event.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['confirmed', 'completed'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'parking':
        service = await ParkingBooking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['CONFIRMED', 'OCCUPIED', 'COMPLETED'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      default:
        throw new AppError('Invalid action', 400, socialConstants.ERROR_CODES[2]);
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
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const post = await Post.findByPk(postId, { transaction });
  if (!post) {
    throw new AppError('Invalid post', 400, socialConstants.ERROR_CODES[9]);
  }

  if (post.privacy === 'friends') {
    const connection = await sequelize.models.UserConnections.findOne({
      where: { user_id: post.user_id, friend_id: customerId, status: 'accepted' },
      transaction,
    });
    if (!connection) {
      throw new AppError('Unauthorized', 403, socialConstants.ERROR_CODES[13]);
    }
  }

  if (!socialConstants.SOCIAL_SETTINGS.REACTION_TYPES.includes(reaction)) {
    throw new AppError('Invalid reaction', 400, socialConstants.ERROR_CODES[10]);
  }

  const existingReaction = await PostReaction.findOne({
    where: { post_id: postId, user_id: customerId },
    transaction,
  });
  if (existingReaction) {
    throw new AppError('Already reacted', 400, socialConstants.ERROR_CODES[14]);
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
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  if (!socialConstants.SOCIAL_SETTINGS.STORY_TYPES.includes(media.type) || !media.url || typeof media.url !== 'string') {
    throw new AppError('Invalid story', 400, socialConstants.ERROR_CODES[11]);
  }

  let service;
  if (serviceType && serviceId) {
    switch (serviceType) {
      case 'booking':
        service = await Booking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['approved', 'seated', 'completed'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'order':
        service = await Order.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['completed', 'delivered'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'ride':
        service = await Ride.findByPk(serviceId, { transaction });
        if (!service || service.customerId !== customerId || service.status !== 'COMPLETED') {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'event':
        service = await Event.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['confirmed', 'completed'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'parking':
        service = await ParkingBooking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId || !['CONFIRMED', 'OCCUPIED', 'COMPLETED'].includes(service.status)) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      default:
        throw new AppError('Invalid action', 400, socialConstants.ERROR_CODES[2]);
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
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const friend = await User.findByPk(friendId, { include: ['customer_profile'], transaction });
  if (!friend || !friend.customer_profile) {
    throw new AppError('Invalid friend', 400, socialConstants.ERROR_CODES[1]);
  }

  if (!socialConstants.SOCIAL_SETTINGS.INVITE_METHODS.includes(method)) {
    throw new AppError('Invalid invite', 400, socialConstants.ERROR_CODES[15]);
  }

  let service, maxFriends;
  switch (serviceType) {
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['pending', 'approved'].includes(service.status)) {
        throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
      }
      maxFriends = mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING;
      break;
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['pending', 'confirmed'].includes(service.status)) {
        throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
      }
      maxFriends = munchConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_ORDER;
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service || service.customerId !== customerId || !['REQUESTED', 'ACCEPTED'].includes(service.status)) {
        throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
      }
      maxFriends = rideConstants.GROUP_CONFIG.MAX_PARTY_SIZE;
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['draft', 'confirmed'].includes(service.status)) {
        throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
      }
      maxFriends = meventsConstants.GROUP_CONFIG.MAX_FRIENDS_PER_EVENT;
      break;
    case 'parking':
      service = await ParkingBooking.findByPk(serviceId, { transaction });
      if (!service || service.customer_id !== customerId || !['PENDING', 'CONFIRMED'].includes(service.status)) {
        throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
      }
      maxFriends = mparkConstants.GROUP_CONFIG.MAX_FRIENDS_PER_PARKING;
      break;
    default:
      throw new AppError('Invalid action', 400, socialConstants.ERROR_CODES[2]);
  }

  const inviteCount = await ServiceInvite.count({
    where: { service_type: serviceType, service_id: serviceId },
    transaction,
  });
  if (inviteCount >= maxFriends) {
    throw new AppError('Max friends exceeded', 400, socialConstants.ERROR_CODES[16]);
  }

  const existingInvite = await ServiceInvite.findOne({
    where: { service_type: serviceType, service_id: serviceId, friend_id: friendId },
    transaction,
  });
  if (existingInvite) {
    throw new AppError('Invalid invite', 400, socialConstants.ERROR_CODES[15]);
  }

  const invite = await ServiceInvite.create({
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

module.exports = {
  createPost,
  managePostReactions,
  shareStory,
  inviteFriendToService,
};