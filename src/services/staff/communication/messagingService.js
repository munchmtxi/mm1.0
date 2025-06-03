'use strict';

/**
 * messagingService.js
 * Manages internal messaging for munch (staff role). Sends messages, broadcasts announcements,
 * logs communications, and awards points.
 * Last Updated: May 26, 2025
 */

const { Message, Staff, Shift, AuditLog, GamificationPoints, GroupChat, GroupChatMessage } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Sends a direct message to a staff member.
 * @param {number} staffId - Sender staff ID.
 * @param {Object} message - Message details (receiverId, content).
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Sent message record.
 */
async function sendMessage(staffId, message, ipAddress) {
  try {
    const { receiverId, content } = message;
    const sender = await Staff.findByPk(staffId);
    const receiver = await Staff.findByPk(receiverId);
    if (!sender || !receiver) {
      throw new AppError('Invalid sender or receiver', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const encryptedContent = await securityService.encryptData({ content });
    const newMessage = await Message.create({
      sender_id: staffId,
      receiver_id: receiverId,
      content: encryptedContent,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, receiverId, messageId: newMessage.id, action: 'send_message' },
      ipAddress,
    });

    const localizedMessage = localization.formatMessage('communication.message_sent', { messageId: newMessage.id });
    await notificationService.sendNotification({
      userId: receiverId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message: localizedMessage,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:communication:${receiverId}`, 'communication:message_received', {
      messageId: newMessage.id,
      senderId: staffId,
      content,
    });

    return newMessage;
  } catch (error) {
    logger.error('Message sending failed', { error: error.message, staffId });
    throw new AppError(`Message sending failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Broadcasts an announcement to staff assigned to a shift.
 * @param {number} scheduleId - Shift ID.
 * @param {Object} message - Announcement details (content).
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function broadcastAnnouncement(scheduleId, message, ipAddress) {
  try {
    const shift = await Shift.findByPk(scheduleId, { include: [{ model: Staff, as: 'staff' }] });
    if (!shift) {
      throw new AppError('Shift not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const encryptedContent = await securityService.encryptData({ content: message.content });
    const groupChat = await GroupChat.findOne({
      where: { name: `shift_${scheduleId}`, status: 'active' },
    });

    let chatId;
    if (!groupChat) {
      const newGroupChat = await GroupChat.create({
        creator_id: shift.staff.user_id,
        name: `shift_${scheduleId}`,
        status: 'active',
      });
      chatId = newGroupChat.id;

      await newGroupChat.addMember(shift.staff.user_id);
    } else {
      chatId = groupChat.id;
    }

    const groupMessage = await GroupChatMessage.create({
      chat_id: chatId,
      sender_id: shift.staff.user_id,
      content: encryptedContent,
    });

    await auditService.logAction({
      userId: shift.staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { scheduleId, messageId: groupMessage.id, action: 'broadcast_announcement' },
      ipAddress,
    });

    const localizedMessage = localization.formatMessage('communication.announcement_broadcast', { shiftId: scheduleId });
    await notificationService.sendNotification({
      userId: shift.staff.id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      message: localizedMessage,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:communication:shift_${scheduleId}`, 'communication:announcement_broadcast', {
      shiftId: scheduleId,
      content: message.content,
    });
  } catch (error) {
    logger.error('Announcement broadcast failed', { error: error.message, scheduleId });
    throw new AppError(`Announcement broadcast failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Records communication history for audit.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Array>} Communication logs.
 */
async function logCommunication(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [{ sender_id: staffId }, { receiver_id: staffId }],
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const groupMessages = await GroupChatMessage.findAll({
      where: { sender_id: staff.user_id },
      include: [{ model: GroupChat, as: 'chat' }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    const logs = [
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

    socketService.emit(`munch:communication:${staffId}`, 'communication:logs_retrieved', { staffId, logs });

    return logs;
  } catch (error) {
    logger.error('Communication logging failed', { error: error.message, staffId });
    throw new AppError(`Communication logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards points for communication activities.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardCommunicationPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action;
    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Communication points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  sendMessage,
  broadcastAnnouncement,
  logCommunication,
  awardCommunicationPoints,
};