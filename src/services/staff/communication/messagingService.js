// messagingService.js
// Manages internal messaging for munch staff. Sends messages, broadcasts announcements, and logs communications.
// Last Updated: May 26, 2025

'use strict';

const { Op } = require('sequelize');
const { Message, Staff, Shift, GroupChat, GroupChatMessage } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function sendMessage(staffId, message) {
  try {
    const { receiverId, content } = message;
    const sender = await Staff.findByPk(staffId);
    const receiver = await Staff.findByPk(receiverId);
    if (!sender || !receiver) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const newMessage = await Message.create({
      sender_id: staffId,
      receiver_id: receiverId,
      content,
    });

    return newMessage;
  } catch (error) {
    logger.error('Error sending message', { error: error.message, staffId });
    throw error;
  }
}

async function broadcastAnnouncement(scheduleId, message) {
  try {
    const shift = await Shift.findByPk(scheduleId, { include: [{ model: Staff, as: 'staff' }] });
    if (!shift) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const groupChat = await GroupChat.findOne({
      where: { name: `shift_${scheduleId}`, status: 'active' },
    });

    let chatId;
    if (!groupChat) {
      const newGroupChat = await GroupChat.create({
        creator_id: shift.staff[0].id,
        name: `shift_${scheduleId}`,
        status: 'active',
      });
      chatId = newGroupChat.id;
      await newGroupChat.addMember(shift.staff[0].id);
    } else {
      chatId = groupChat.id;
    }

    const groupMessage = await GroupChatMessage.create({
      chat_id: chatId,
      sender_id: shift.staff[0].id,
      content: message.content,
    });

    return groupMessage;
  } catch (error) {
    logger.error('Error broadcasting announcement', { error: error.message, scheduleId });
    throw error;
  }
}

async function logCommunication(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: staffId }, { receiver_id: staffId }],
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const groupMessages = await GroupChatMessage.findAll({
      where: { sender_id: staffId },
      include: [{ model: GroupChat, as: 'chat' }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    return [
      ...messages.map(m => ({
        type: 'direct',
        messageId: m.id,
        content: m.content,
        timestamp: m.created_at,
      })),
      ...groupMessages.map(gm => ({
        type: 'group',
        messageId: gm.id,
        chatId: gm.chat_id,
        content: gm.content,
        timestamp: gm.created_at,
      })),
    ];
  } catch (error) {
    logger.error('Error logging communication', { error: error.message, staffId });
    throw error;
  }
}

module.exports = {
  sendMessage,
  broadcastAnnouncement,
  logCommunication,
};