// messagingService.js
// Manages internal and external messaging for staff, drivers, customers, and merchants.
// Supports real-time, context-aware communication for active orders, bookings, and parking bookings.
// Last Updated: July 15, 2025

'use strict';

const { Op } = require('sequelize');
const { Message, GroupChat, GroupChatMessage, User, Order, InDiningOrder, Booking, Staff, Driver, Customer, Merchant, ParkingBooking } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const customerConstants = require('@constants/customer/customerConstants');
const driverConstants = require('@constants/driver/driverConstants');
const logger = require('@utils/logger');

async function sendMessage(senderId, message) {
  try {
    const { receiverId, content, orderId, bookingId, parkingBookingId } = message;

    const sender = await User.findByPk(senderId, { include: ['staff_profile', 'driver_profile', 'customer_profile', 'merchant_profile'] });
    const receiver = await User.findByPk(receiverId, { include: ['staff_profile', 'driver_profile', 'customer_profile', 'merchant_profile'] });

    if (!sender || !receiver) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const newMessage = await Message.create({
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      order_id: orderId || null,
      booking_id: bookingId || null,
      parking_booking_id: parkingBookingId || null,
    });

    return newMessage;
  } catch (error) {
    logger.error('Error sending message', { error: error.message, senderId });
    throw error;
  }
}

async function broadcastAnnouncement(entityId, message, entityType = 'order') {
  try {
    let members = [];
    let chatName;

    if (entityType === 'order') {
      const order = await Order.findByPk(entityId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: Merchant, as: 'merchant' },
          { model: Driver, as: 'driver' },
          { model: Staff, as: 'staff' },
        ],
      });
      if (!order) throw new Error('Order not found');

      members = [
        order.customer?.user_id,
        order.merchant?.user_id,
        order.driver?.user_id,
        order.staff?.user_id,
      ].filter(id => id);
      chatName = `order_${entityId}`;
    } else if (entityType === 'in_dining_order') {
      const inDiningOrder = await InDiningOrder.findByPk(entityId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: Merchant, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
          { model: Staff, as: 'server' },
        ],
      });
      if (!inDiningOrder) throw new Error('In-dining order not found');

      members = [
        inDiningOrder.customer?.user_id,
        inDiningOrder.branch?.merchant?.user_id,
        inDiningOrder.server?.user_id,
      ].filter(id => id);
      chatName = `indining_${entityId}`;
    } else if (entityType === 'booking') {
      const booking = await Booking.findByPk(entityId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: Merchant, as: 'merchant' },
          { model: Staff, as: 'staff' },
        ],
      });
      if (!booking) throw new Error('Booking not found');

      members = [
        booking.customer?.user_id,
        booking.merchant?.user_id,
        booking.staff?.user_id,
      ].filter(id => id);
      chatName = `booking_${entityId}`;
    } else if (entityType === 'parking_booking') {
      const parkingBooking = await ParkingBooking.findByPk(entityId, {
        include: [
          { model: Customer, as: 'customer' },
          { model: Merchant, as: 'merchant' },
          { model: Staff, as: 'staff' },
        ],
      });
      if (!parkingBooking) throw new Error('Parking booking not found');

      members = [
        parkingBooking.customer?.user_id,
        parkingBooking.merchant?.user_id,
        parkingBooking.staff?.user_id,
      ].filter(id => id);
      chatName = `parking_booking_${entityId}`;
    } else {
      throw new Error('Invalid entity type');
    }

    const groupChat = await GroupChat.findOne({
      where: { name: chatName, status: 'active' },
    });

    let chatId;
    if (!groupChat) {
      const newGroupChat = await GroupChat.create({
        creator_id: members[0],
        name: chatName,
        status: 'active',
      });
      chatId = newGroupChat.id;
      await newGroupChat.addMembers(members);
    } else {
      chatId = groupChat.id;
    }

    const groupMessage = await GroupChatMessage.create({
      chat_id: chatId,
      sender_id: members[0],
      content: message.content,
    });

    return groupMessage;
  } catch (error) {
    logger.error('Error broadcasting announcement', { error: error.message, entityId, entityType });
    throw error;
  }
}

async function logCommunication(userId) {
  try {
    const user = await User.findByPk(userId, { include: ['staff_profile'] });
    if (!user) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: userId }, { receiver_id: userId }],
      },
      include: [
        { model: Order, as: 'order' },
        { model: Booking, as: 'booking' },
        { model: ParkingBooking, as: 'parking_booking' },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const groupMessages = await GroupChatMessage.findAll({
      where: { sender_id: userId },
      include: [
        { model: GroupChat, as: 'chat', include: [{ model: User, as: 'members' }] },
      ],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    return [
      ...messages.map(m => ({
        type: 'direct',
        messageId: m.id,
        content: m.content,
        timestamp: m.created_at,
        orderId: m.order?.id,
        bookingId: m.booking?.id,
        parkingBookingId: m.parking_booking?.id,
      })),
      ...groupMessages.map(gm => ({
        type: 'group',
        messageId: gm.id,
        chatId: gm.chat_id,
        content: gm.content,
        timestamp: gm.created_at,
        members: gm.chat.members.map(m => m.id),
      })),
    ];
  } catch (error) {
    logger.error('Error logging communication', { error: error.message, userId });
    throw error;
  }
}

module.exports = {
  sendMessage,
  broadcastAnnouncement,
  logCommunication,
};