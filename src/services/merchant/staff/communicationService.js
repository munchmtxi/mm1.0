'use strict';

/**
 * communicationService.js
 * Manages staff messaging, shift announcements, and communication channels for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const staffSystemConstants = require('@constants/staff/staffSystemConstants');
const { Staff, Merchant, User, Shift, Message, Channel, Notification, AuditLog } = require('@models');

/**
 * Sends a message to a staff member.
 * @param {number} staffId - Receiver staff ID.
 * @param {Object} message - Message details { senderId, content, channelId }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Message details.
 */
async function sendMessage(staffId, message, io) {
  try {
    const { senderId, content, channelId } = message;
    if (!staffId || !senderId || !content) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const [receiver, sender] = await Promise.all([
      Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] }),
      Staff.findByPk(senderId, { include: [{ model: User, as: 'user' }] }),
    ]);
    if (!receiver || !sender) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const channel = channelId ? await Channel.findByPk(channelId) : null;
    if (channelId && !channel) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH);

    const newMessage = await Message.create({
      sender_id: senderId,
      receiver_id: staffId,
      channel_id: channelId,
      content,
    });

    await auditService.logAction({
      userId: sender.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { senderId, receiverId: staffId, channelId, content },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:messageSent', { senderId, receiverId: staffId, content }, `staff:${staffId}`);

    return newMessage;
  } catch (error) {
    logger.error('Error sending message', { error: error.message });
    throw error;
  }
}

/**
 * Broadcasts shift updates.
 * @param {number} scheduleId - Shift ID.
 * @param {Object} message - Announcement details { content }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function announceShift(scheduleId, message, io) {
  try {
    const { content } = message;
    if (!scheduleId || !content) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_SHIFT);

    const shift = await Shift.findByPk(scheduleId, { include: [{ model: Staff, as: 'staff', include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] }] });
    if (!shift) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_SHIFT);

    const result = await notificationService.sendNotification({
      userId: shift.staff.user_id,
      notificationType: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ANNOUNCEMENT,
      messageKey: 'staff.shift_announcement',
      messageParams: { content, date: shift.start_time },
      role: 'staff',
      module: 'communication',
      languageCode: shift.staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    await auditService.logAction({
      userId: shift.staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { scheduleId, content },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:shiftAnnounced', { scheduleId, content }, `staff:${shift.staff_id}`);

    return result;
  } catch (error) {
    logger.error('Error announcing shift', { error: error.message });
    throw error;
  }
}

/**
 * Organizes communication channels.
 * @param {number} restaurantId - Branch ID.
 * @param {Object} channel - Channel details { name, type }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Channel details.
 */
async function manageChannels(restaurantId, channel, io) {
  try {
    const { name, type } = channel;
    if (!restaurantId || !name || !type) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
    }

    if (!['team', 'shift', 'manager'].includes(type)) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
    }

    const branch = await MerchantBranch.findByPk(restaurantId);
    if (!branch) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.INVALID_BRANCH);

    const newChannel = await Channel.create({
      branch_id: restaurantId,
      name,
      type,
    });

    await auditService.logAction({
      userId: null,
      role: 'system',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { branchId: restaurantId, channelId: newChannel.id, type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:channelManaged', { branchId: restaurantId, channelId: newChannel.id, type }, `branch:${restaurantId}`);

    return newChannel;
  } catch (error) {
    logger.error('Error managing channels', { error: error.message });
    throw error;
  }
}

/**
 * Logs staff communications.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Communication log.
 */
async function trackCommunication(staffId, io) {
  try {
    if (!staffId) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const messages = await Message.findAll({
      where: {
        [sequelize.Op.or]: [{ sender_id: staffId }, { receiver_id: staffId }],
      },
      attributes: ['id', 'sender_id', 'receiver_id', 'channel_id', 'content', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_RETRIEVE,
      details: { staffId, messageCount: messages.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:communicationTracked', { staffId, messageCount: messages.length }, `staff:${staffId}`);

    return { staffId, messages };
  } catch (error) {
    logger.error('Error tracking communication', { error: error.message });
    throw error;
  }
}

module.exports = {
  sendMessage,
  announceShift,
  manageChannels,
  trackCommunication,
};