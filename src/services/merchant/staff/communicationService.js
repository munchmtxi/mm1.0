'use strict';

const logger = require('@utils/logger');
const staffConstants = require('@constants/staff/staffSystemConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const { Staff, Merchant, User, Shift, Message, Channel, MerchantBranch, Driver } = require('@models');

async function sendMessage(staffId, message, io, auditService, socketService, pointService) {
  const functionName = 'sendMessage';
  try {
    const { senderId, content, channelId } = message;
    if (!staffId || !senderId || !content) {
      throw new AppError(
        'Invalid input provided',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
        'Missing required fields: staffId, senderId, or content'
      );
    }

    const [receiver, sender] = await Promise.all([
      Staff.findByPk(staffId, { include: [{ model: User, as: 'user' }, { model: MerchantBranch, as: 'branch' }] }),
      Staff.findByPk(senderId, { include: [{ model: User, as: 'user' }, { model: MerchantBranch, as: 'branch' }] }),
    ]);

    if (!receiver || !sender) {
      throw new AppError(
        'Staff not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        `Staff ID ${!receiver ? staffId : senderId} not found`
      );
    }

    // Validate staff types
    if (
      !receiver.staff_types.some(type => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(type)) ||
      !sender.staff_types.some(type => staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(type))
    ) {
      throw new AppError(
        'Invalid staff type',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE,
        'Sender or receiver has invalid staff type'
      );
    }

    const channel = channelId
      ? await Channel.findByPk(channelId, { include: [{ model: MerchantBranch, as: 'branch' }] })
      : null;
    if (channelId && !channel) {
      throw new AppError(
        'Invalid channel',
        404,
        staffConstants.STAFF_ERROR_CODES.INVALID_CHANNEL,
        `Channel ID ${channelId} not found`
      );
    }

    const newMessage = await Message.create({
      sender_id: senderId,
      receiver_id: staffId,
      channel_id: channelId,
      content,
    });

    await auditService.logAction({
      userId: sender.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_message_sent')
        ? 'staff_message_sent'
        : 'message_sent',
      details: { senderId, receiverId: staffId, channelId, content },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:messageSent', { senderId, receiverId: staffId, content }, `staff:${staffId}`);

    await pointService.awardPoints(
      sender.user_id,
      'message_sent',
      staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'message_sent')?.points || 10
    );

    return newMessage;
  } catch (error) {
    logger.logErrorEvent(`Error in ${functionName}`, { error: error.message, stack: error.stack });
    throw handleServiceError(functionName, error, error.code || staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
  }
}

async function announceShift(scheduleId, message, io, auditService, socketService, notificationService, pointService) {
  const functionName = 'announceShift';
  try {
    const { content } = message;
    if (!scheduleId || !content) {
      throw new AppError(
        'Invalid shift input',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_SHIFT,
        'Missing required fields: scheduleId or content'
      );
    }

    const shift = await Shift.findByPk(scheduleId, {
      include: [
        { model: Staff, as: 'staff', include: [{ model: MerchantBranch, as: 'branch' }, { model: User, as: 'user' }] },
        { model: Driver, as: 'driver' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });

    if (!shift) {
      throw new AppError(
        'Shift not found',
        404,
        staffConstants.STAFF_ERROR_CODES.INVALID_SHIFT,
        `Shift ID ${scheduleId} not found`
      );
    }

    const userId = shift.staff?.user_id || shift.driver?.user_id;
    if (!userId) {
      throw new AppError(
        'Staff or driver not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        'No staff or driver associated with shift'
      );
    }

    const languageCode = shift.branch?.preferred_language || merchantConstants.BUSINESS_SETTINGS.DEFAULT_LANGUAGE || 'en';

    const result = await notificationService.sendNotification({
      userId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('announcement')
        ? 'announcement'
        : 'general',
      messageKey: 'staff.shift_announcement',
      messageParams: { content, date: shift.start_time },
      role: shift.staff ? 'staff' : 'driver',
      module: 'communication',
      languageCode,
    });

    await auditService.logAction({
      userId,
      role: shift.staff ? 'staff' : 'driver',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('shift_announced')
        ? 'shift_announced'
        : 'announcement_sent',
      details: { scheduleId, content },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(
      io,
      'staff:shiftAnnounced',
      { scheduleId, content },
      `staff:${shift.staff_id || shift.driver_id}`
    );

    await pointService.awardPoints(
      userId,
      'shift_announced',
      staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'shift_announced')?.points || 10
    );

    return result;
  } catch (error) {
    logger.logErrorEvent(`Error in ${functionName}`, { error: error.message, stack: error.stack });
    throw handleServiceError(functionName, error, error.code || staffConstants.STAFF_ERROR_CODES.INVALID_SHIFT);
  }
}

async function manageChannels(restaurantId, channel, io, auditService, socketService, pointService) {
  const functionName = 'manageChannels';
  try {
    const { name, type } = channel;
    if (!restaurantId || !name || !type) {
      throw new AppError(
        'Invalid branch input',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
        'Missing required fields: restaurantId, name, or type'
      );
    }

    if (!staffConstants.CHANNEL_TYPES?.includes(type)) {
      throw new AppError(
        'Invalid channel type',
        400,
        staffConstants.STAFF_ERROR_CODES.INVALID_CHANNEL_TYPE,
        `Channel type ${type} not allowed`
      );
    }

    const branch = await MerchantBranch.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
    });
    if (!branch) {
      throw new AppError(
        'Branch not found',
        404,
        staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH,
        `Branch ID ${restaurantId} not found`
      );
    }

    const newChannel = await Channel.create({
      branch_id: restaurantId,
      name,
      type,
    });

    await auditService.logAction({
      userId: null,
      role: 'system',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('channel_created')
        ? 'channel_created'
        : 'channel_managed',
      details: { branchId: restaurantId, channelId: newChannel.id, type },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(
      io,
      'staff:channelManaged',
      { branchId: restaurantId, channelId: newChannel.id, type },
      `branch:${restaurantId}`
    );

    await pointService.awardPoints(
      null,
      'channel_created',
      staffConstants.STAFF_GAMIFICATION_CONSTANTS?.STAFF_ACTIONS?.find(a => a.action === 'channel_created')?.points || 10
    );

    return newChannel;
  } catch (error) {
    logger.logErrorEvent(`Error in ${functionName}`, { error: error.message, stack: error.stack });
    throw handleServiceError(functionName, error, error.code || staffConstants.STAFF_ERROR_CODES.INVALID_BRANCH);
  }
}

async function trackCommunication(staffId, io, auditService, socketService) {
  const functionName = 'trackCommunication';
  try {
    if (!staffId) {
      throw new AppError(
        'Staff ID required',
        400,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        'Missing staffId'
      );
    }

    const staff = await Staff.findByPk(staffId, {
      include: [{ model: User, as: 'user' }, { model: MerchantBranch, as: 'branch' }],
    });
    if (!staff) {
      throw new AppError(
        'Staff not found',
        404,
        staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND,
        `Staff ID ${staffId} not found`
      );
    }

    const messages = await Message.findAll({
      where: {
        [sequelize.Op.or]: [{ sender_id: staffId }, { receiver_id: staffId }],
      },
      attributes: ['id', 'sender_id', 'receiver_id', 'channel_id', 'content', 'created_at'],
      order: [['created_at', 'DESC']],
      include: [{ model: Channel, as: 'channel', include: [{ model: MerchantBranch, as: 'branch' }] }],
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_communication_tracked')
        ? 'staff_communication_tracked'
        : 'communication_tracked',
      details: { staffId, messageCount: messages.length },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(
      io,
      'staff:communicationTracked',
      { staffId, messageCount: messages.length },
      `staff:${staffId}`
    );

    return { staffId, messages };
  } catch (error) {
    logger.logErrorEvent(`Error in ${functionName}`, { error: error.message, stack: error.stack });
    throw handleServiceError(functionName, error, error.code || staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
  }
}

module.exports = {
  sendMessage,
  announceShift,
  manageChannels,
  trackCommunication,
};