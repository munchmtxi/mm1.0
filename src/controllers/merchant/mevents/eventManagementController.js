'use strict';

const { sequelize } = require('@models');
const eventManagementService = require('@services/merchant/mevents/eventManagementService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const meventsConstants = require('@constants/merchant/meventsConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role) => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'eventCreated' && metadata.participantCount) {
    multipliers *= actionConfig.multipliers.participantCount * metadata.participantCount || 1;
  }
  if (action === 'groupBookingsManaged' && metadata.serviceCount) {
    multipliers *= actionConfig.multipliers.serviceCount * metadata.serviceCount || 1;
  }
  if (action === 'groupChatFacilitated' && metadata.participantCount) {
    multipliers *= actionConfig.multipliers.participantCount * metadata.participantCount || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const createEvent = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const details = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await eventManagementService.createEvent(eventId, details, ipAddress, transaction);
    const points = calculatePoints(result.action, { participantCount: result.participantCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: meventsConstants.NOTIFICATION_TYPES.EVENT_CREATED,
        messageKey: 'mevents.eventCreated',
        messageParams: { title: result.title },
        priority: 'HIGH',
        role: 'merchant',
        module: 'mevents',
        languageCode: result.language,
      },
      transaction
    );

    for (const participantId of details.participantIds || []) {
      const participant = await User.findByPk(participantId, { attributes: ['preferred_language'], transaction });
      await notificationService.sendNotification(
        {
          userId: participantId,
          notificationType: meventsConstants.NOTIFICATION_TYPES.EVENT_INVITATION,
          messageKey: 'mevents.invitation',
          messageParams: { title: result.title, creatorId: req.user.id },
          priority: 'HIGH',
          role: 'customer',
          module: 'mevents',
          languageCode: participant.preferred_language || 'en',
        },
        transaction
      );
    }

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { participantCount: result.participantCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: meventsConstants.NOTIFICATION_TYPES.EVENT_UPDATED,
          messageKey: 'mevents.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'mevents',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchant',
        action: meventsConstants.AUDIT_TYPES.EVENT_CREATED,
        details: { eventId: result.eventId, title: result.title, participantCount: result.participantCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mevents:eventCreated', {
      eventId: result.eventId,
      title: result.title,
      points,
    }, `merchant:${details.merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageGroupBookings = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const bookings = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await eventManagementService.manageGroupBookings(eventId, bookings, ipAddress, transaction);
    const points = calculatePoints(result.action, { serviceCount: result.serviceCount }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: req.user.id,
        notificationType: meventsConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST,
        messageKey: 'mevents.groupBookingsManaged',
        messageParams: { serviceCount: result.serviceCount },
        priority: 'HIGH',
        role: 'merchant',
        module: 'mevents',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, { points }, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { serviceCount: result.serviceCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: meventsConstants.NOTIFICATION_TYPES.EVENT_UPDATED,
          messageKey: 'mevents.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'mevents',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchantId',
        action: 'group_bookings_managed',
        details: { eventId: eventId, totalAmount: result.totalAmount, serviceCount: result.serviceCount, points },
        ipAddress: ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mevents:groupBookingsManaged', {
      eventId: eventId,
      serviceCount: result.serviceCount,
      points: points,
    }, `merchant:${(await Event.findByPk(eventId, { attributes: ['customer_id'], transaction })).customer_id}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const facilitateGroupChat = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { participants } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await eventManagementService.facilitateGroupChat(eventId, participants, ipAddress, transaction);
    const points = calculatePoints(result.action, { participantCount: result.participantCount }, 'merchant');

    await socketService.createRoom(result.chatRoom, participants);

    for (const participantId of participants) {
      const participant = await User.findByPk(participantId, { attributes: ['preferred_language'], transaction });
      await notificationService.sendNotification(
        {
          userId: participantId,
          notificationType: meventsConstants.NOTIFICATION_TYPES.EVENT_CHAT_MESSAGE,
          messageKey: 'mevents.chatEnabled',
          messageParams: { eventId: result.eventId },
          priority: 'MEDIUM',
          role: 'customer',
          module: 'mevents',
          languageCode: participant.preferred_language || 'en',
        },
        transaction
      );
    }

    if (points > 0) {
      await gamificationService.awardPoints(req.user.id, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { participantCount: result.participantCount },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: req.user.id,
          notificationType: meventsConstants.NOTIFICATION_TYPES.EVENT_UPDATED,
          messageKey: 'mevents.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'mevents',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: req.user.id,
        role: 'merchant',
        action: meventsConstants.AUDIT_TYPES.CHAT_MESSAGE_SENT,
        details: { eventId: result.eventId, chatRoom: result.chatRoom, participantCount: result.participantCount, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:mevents:groupChatFacilitated', {
      eventId: result.eventId,
      chatRoom: result.chatRoom,
      points,
    }, `merchant:${(await Event.findByPk(eventId, { attributes: ['customer_id'], transaction })).customer_id}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { createEvent, manageGroupBookings, facilitateGroupChat };