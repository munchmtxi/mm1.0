// messagingController.js
// Handles internal messaging requests for staff, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const messagingService = require('@services/staff/communication/messagingService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const staffConstants = require('@constants/staff/staffConstants');
const { Staff } = require('@models');

async function sendMessage(req, res, next) {
  try {
    const { staffId, receiverId, content } = req.body;
    const io = req.app.get('io');

    const message = await messagingService.sendMessage(staffId, { receiverId, content });

    const receiver = await Staff.findByPk(receiverId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { staffId, receiverId, messageId: message.id, action: 'send_message' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: (await Staff.findByPk(staffId)).position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { staffId, messageId: message.id },
    });

    await notificationService.sendNotification({
      userId: receiverId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.announcement,
      messageKey: 'communication.message_sent',
      messageParams: { messageId: message.id },
      role: 'staff',
      module: 'communication',
      languageCode: receiver.preferred_language || 'en',
    });

    socketService.emit(io, `staff:communication:message_received`, {
      messageId: message.id,
      senderId: staffId,
      content,
    }, `staff:${receiverId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('communication.message_sent', { messageId: message.id }, receiver.preferred_language || 'en'),
      data: message,
    });
  } catch (error) {
    next(error);
  }
}

async function broadcastAnnouncement(req, res, next) {
  try {
    const { scheduleId, content } = req.body;
    const io = req.app.get('io');

    const groupMessage = await messagingService.broadcastAnnouncement(scheduleId, { content });

    const shift = await Shift.findByPk(scheduleId, { include: [{ model: Staff, as: 'staff' }] });
    await auditService.logAction({
      userId: shift.staff[0].id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_update,
      details: { scheduleId, messageId: groupMessage.id, action: 'broadcast_announcement' },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: shift.staff[0].id,
      role: 'staff',
      subRole: shift.staff[0].position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { scheduleId, messageId: groupMessage.id },
    });

    await notificationService.sendNotification({
      userId: shift.staff[0].id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.announcement,
      messageKey: 'communication.announcement_broadcast',
      messageParams: { shiftId: scheduleId },
      role: 'staff',
      module: 'communication',
      languageCode: shift.staff[0].preferred_language || 'en',
    });

    socketService.emit(io, `staff:communication:announcement_broadcast`, {
      shiftId: scheduleId,
      content,
    }, `shift:${scheduleId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('communication.announcement_broadcast', { shiftId: scheduleId }, shift.staff[0].preferred_language || 'en'),
      data: groupMessage,
    });
  } catch (error) {
    next(error);
  }
}

async function logCommunication(req, res, next) {
  try {
    const { staffId } = req.body;
    const io = req.app.get('io');

    const logs = await messagingService.logCommunication(staffId);

    const staff = await Staff.findByPk(staffId);
    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.staff_profile_retrieve,
      details: { staffId, action: 'log_communication', logs: logs.length },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.action,
      points: staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.task_completion.points,
      details: { staffId, logs: logs.length },
    });

    socketService.emit(io, `staff:communication:logs_retrieved`, {
      staffId,
      logs,
    }, `staff:${staffId}`);

    res.status(200).json({
      success: true,
      message: formatMessage('communication.logs_retrieved', { count: logs.length }, staff.preferred_language || 'en'),
      data: logs,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendMessage,
  broadcastAnnouncement,
  logCommunication,
};