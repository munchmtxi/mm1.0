'use strict';

const { sequelize, User, UserConnections, FriendPermissions, GroupChat, GroupChatMessage, Booking, Order, Ride, Event, ParkingBooking, LiveStream } = require('@models');
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

async function manageFriendList(customerId, friendId, action, transaction) {
  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const friend = await User.findByPk(friendId, { include: ['customer_profile'], transaction });
  if (!friend || !friend.customer_profile || customerId === friendId) {
    throw new AppError('Invalid friend', 400, socialConstants.ERROR_CODES[1]);
  }

  if (!socialConstants.SOCIAL_SETTINGS.FRIEND_ACTIONS.includes(action)) {
    throw new AppError('Invalid action', 400, socialConstants.ERROR_CODES[2]);
  }

  let connection = await UserConnections.findOne({ where: { user_id: customerId, friend_id: friendId }, transaction });
  const reverseConnection = await UserConnections.findOne({ where: { user_id: friendId, friend_id: customerId }, transaction });

  let result;
  switch (action) {
    case 'add':
      if (connection || reverseConnection) {
        throw new AppError('Pending request exists', 400, socialConstants.ERROR_CODES[3]);
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
        throw new AppError('No pending request', 400, socialConstants.ERROR_CODES[3]);
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
        throw new AppError('No pending request', 400, socialConstants.ERROR_CODES[3]);
      }
      reverseConnection.status = 'rejected';
      await reverseConnection.save({ transaction });
      result = { status: 'rejected', friendId };
      break;
    case 'remove':
      if (!connection || connection.status !== 'accepted') {
        throw new AppError('Not friends', 400, socialConstants.ERROR_CODES[4]);
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
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const friend = await User.findByPk(friendId, { include: ['customer_profile'], transaction });
  if (!friend || !friend.customer_profile) {
    throw new AppError('Invalid friend', 400, socialConstants.ERROR_CODES[1]);
  }

  const connection = await UserConnections.findOne({
    where: { user_id: customerId, friend_id: friendId, status: 'accepted' },
    transaction,
  });
  if (!connection) {
    throw new AppError('Not friends', 400, socialConstants.ERROR_CODES[4]);
  }

  const validPermissions = socialConstants.SOCIAL_SETTINGS.PERMISSION_TYPES;
  const invalidPerms = Object.keys(permissions).filter(key => !validPermissions.includes(key));
  if (invalidPerms.length) {
    throw new AppError('Invalid permissions', 400, socialConstants.ERROR_CODES[5]);
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
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const chat = await GroupChat.findByPk(chatId, { include: [{ model: User, as: 'members' }], transaction });
  if (!chat || chat.status !== 'active') {
    throw new AppError('Invalid chat', 400, socialConstants.ERROR_CODES[6]);
  }

  if (serviceType && serviceId) {
    let service;
    switch (serviceType) {
      case 'booking':
        service = await Booking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'order':
        service = await Order.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'ride':
        service = await Ride.findByPk(serviceId, { transaction });
        if (!service || service.customerId !== customerId) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'event':
        service = await Event.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      case 'parking':
        service = await ParkingBooking.findByPk(serviceId, { transaction });
        if (!service || service.customer_id !== customerId) {
          throw new AppError('Invalid service', 400, socialConstants.ERROR_CODES[18]);
        }
        break;
      default:
        throw new AppError('Invalid action', 400, socialConstants.ERROR_CODES[2]);
    }
  }

  const isMember = chat.members.some(m => m.id === customerId);
  let result;

  if (!isMember && !message && !media) {
    if (chat.members.length >= socialConstants.SOCIAL_SETTINGS.GROUP_CHAT_SETTINGS.MAX_PARTICIPANTS) {
      throw new AppError('Chat limit exceeded', 400, socialConstants.ERROR_CODES[11]);
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
      throw new AppError('Chat limit exceeded', 400, socialConstants.ERROR_CODES[11]);
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
    throw new AppError('Invalid action', 400, socialConstants.ERROR_CODES[2]);
  }

  logger.info('Group chat action processed', { customerId, chatId, action: message || media ? 'message' : 'join' });
  return result;
}

async function createLiveEventStream(customerId, eventId, streamData, transaction) {
  const { title, description, privacy, platform } = streamData;

  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const event = await Event.findByPk(eventId, { transaction });
  if (!event || event.customer_id !== customerId || !['confirmed', 'completed'].includes(event.status)) {
    throw new AppError('Invalid event', 400, socialConstants.ERROR_CODES[9]);
  }

  if (!socialConstants.SOCIAL_SETTINGS.POST_PRIVACY.includes(privacy)) {
    throw new AppError('Invalid privacy setting', 400, socialConstants.ERROR_CODES[9]);
  }

  if (!socialConstants.SOCIAL_SETTINGS.SUPPORTED_PLATFORMS.includes(platform)) {
    throw new AppError('Invalid platform', 400, socialConstants.ERROR_CODES[2]);
  }

  if (title.length > meventsConstants.EVENT_CONFIG.MAX_TITLE_LENGTH || description.length > meventsConstants.EVENT_CONFIG.MAX_DESCRIPTION_LENGTH) {
    throw new AppError('Invalid stream data', 400, socialConstants.ERROR_CODES[9]);
  }

  const stream = await LiveStream.create({
    user_id: customerId,
    event_id: eventId,
    title,
    description,
    privacy,
    platform,
    status: 'active',
    created_at: new Date(),
    expires_at: new Date(Date.now() + socialConstants.SOCIAL_SETTINGS.STORY_DURATION_HOURS * 3600000),
  }, { transaction });

  logger.info('Live event stream created', { customerId, eventId, streamId: stream.id });
  return { streamId: stream.id, eventId, title, description, privacy, platform, expiresAt: stream.expires_at };
}

async function manageSocialRecommendations(customerId, preferences, transaction) {
  const customer = await User.findByPk(customerId, { include: ['customer_profile'], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError('Invalid customer', 400, socialConstants.ERROR_CODES[0]);
  }

  const { serviceTypes, location, dietaryPreferences } = preferences;
  const validServiceTypes = ['mtables', 'munch', 'mtxi', 'mevents', 'mpark'];
  const invalidServices = serviceTypes?.filter(s => !validServiceTypes.includes(s)) || [];

  if (invalidServices.length) {
    throw new AppError('Invalid service types', 400, socialConstants.ERROR_CODES[2]);
  }

  if (dietaryPreferences && !dietaryPreferences.every(p => customerConstants.CUSTOMER_SETTINGS.DIETARY_PREFERENCES.includes(p))) {
    throw new AppError('Invalid dietary preferences', 400, socialConstants.ERROR_CODES[12]);
  }

  if (location && !Object.values(customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CITIES).flat().includes(location)) {
    throw new AppError('Invalid location', 400, socialConstants.ERROR_CODES[7]);
  }

  const friends = await UserConnections.findAll({
    where: { user_id: customerId, status: 'accepted' },
    attributes: ['friend_id'],
    transaction,
  });
  const friendIds = friends.map(f => f.friend_id);

  const recommendations = [];
  if (serviceTypes.includes('mtables')) {
    const bookings = await Booking.findAll({
      where: {
        customer_id: { [Op.in]: friendIds },
        status: ['approved', 'seated', 'completed'],
      },
      limit: 5,
      transaction,
    });
    recommendations.push(...bookings.map(b => ({ service: 'mtables', id: b.id, type: 'booking' })));
  }

  if (serviceTypes.includes('munch')) {
    const orders = await Order.findAll({
      where: {
        customer_id: { [Op.in]: friendIds },
        status: ['completed', 'delivered'],
      },
      limit: 5,
      transaction,
    });
    recommendations.push(...orders.map(o => ({ service: 'munch', id: o.id, type: 'order' })));
  }

  if (serviceTypes.includes('mtxi')) {
    const rides = await Ride.findAll({
      where: {
        customerId: { [Op.in]: friendIds },
        status: 'COMPLETED',
      },
      limit: 5,
      transaction,
    });
    recommendations.push(...rides.map(r => ({ service: 'mtxi', id: r.id, type: 'ride' })));
  }

  if (serviceTypes.includes('mevents')) {
    const events = await Event.findAll({
      where: {
        customer_id: { [Op.in]: friendIds },
        status: ['confirmed', 'completed'],
      },
      limit: 5,
      transaction,
    });
    recommendations.push(...events.map(e => ({ service: 'mevents', id: e.id, type: 'event' })));
  }

  if (serviceTypes.includes('mpark')) {
    const parkingBookings = await ParkingBooking.findAll({
      where: {
        customer_id: { [Op.in]: friendIds },
        status: ['CONFIRMED', 'OCCUPIED', 'COMPLETED'],
      },
      limit: 5,
      transaction,
    });
    recommendations.push(...parkingBookings.map(p => ({ service: 'mpark', id: p.id, type: 'parking' })));
  }

  const filteredRecommendations = recommendations.filter(rec => {
    if (dietaryPreferences && rec.type === 'order') {
      const order = rec;
      return dietaryPreferences.every(pref => order.items?.some(item => item.dietary_preferences?.includes(pref)));
    }
    if (location && ['booking', 'event', 'parking'].includes(rec.type)) {
      return rec.location === location;
    }
    return true;
  });

  logger.info('Social recommendations generated', { customerId, recommendations: filteredRecommendations.length });
  return { customerId, recommendations: filteredRecommendations };
}

module.exports = {
  manageFriendList,
  setFriendPermissions,
  facilitateGroupChat,
  createLiveEventStream,
  manageSocialRecommendations,
};