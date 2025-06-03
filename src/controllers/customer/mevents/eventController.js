'use strict';

const { sequelize } = require('@models');
const eventService = require('@services/customer/mevents/eventService');
const walletService = require('@services/common/walletService');
const notificationService = require('@services/common/notificationService');
const gamificationService = require('@services/common/gamificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const meventsConstants = require('@constants/meventsConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');
const { Booking, Order, Ride, InDiningOrder, Payment, Wallet } = require('@models');

const createEvent = catchAsync(async (req, res, next) => {
  const customerId = req.user.id;
  const { title, description, occasion, paymentType, participantIds } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Creating event', { customerId, title });

  const transaction = await sequelize.transaction();
  try {
    const { event, customer, participants } = await eventService.createEvent({
      customerId,
      title,
      description,
      occasion,
      paymentType,
      participantIds,
      transaction,
    });

    // Send creator notification
    const creatorMessage = formatMessage({
      role: 'customer',
      module: 'mevents',
      languageCode: customer.preferred_language,
      messageKey: 'event.created',
      params: { title },
    });
    await notificationService.createNotification(
      {
        userId: customerId,
        type: meventsConstants.NOTIFICATION_TYPES.EVENT_CREATED,
        message: creatorMessage,
        priority: 'HIGH',
        languageCode: customer.preferred_language,
        eventId: event.id,
      },
      transaction
    );

    // Send participant notifications
    for (const participant of participants) {
      const message = formatMessage({
        role: 'customer',
        module: 'mevents',
        languageCode: participant.preferred_language,
        messageKey: 'event.invitation',
        params: { title, creatorId: customerId },
      });
      await notificationService.createNotification(
        {
          userId: participant.id,
          type: meventsConstants.NOTIFICATION_TYPES.EVENT_INVITATION,
          message,
          priority: 'HIGH',
          languageCode: participant.preferred_language,
          eventId: event.id,
        },
        transaction
      );
    }

    // Log audit
    await auditService.logAction(
      {
        userId: customerId,
        logType: meventsConstants.AUDIT_TYPES.EVENT_CREATED,
        details: { eventId: event.id, title, occasion, paymentType, participantIds },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    await socketService.emit(io, `event:created:${customerId}`, {
      eventId: event.id,
      title,
      status: event.status,
    });

    // Award gamification points
    try {
      const action = meventsConstants.GAMIFICATION_CONSTANTS.EVENT_CREATED;
      await gamificationService.awardPoints(
        {
          userId: customerId,
          action: action.action,
          points: action.points || 10,
          metadata: { io, role: 'customer', eventId: event.id, occasion },
        },
        transaction
      );

      if (participantIds.length > 0) {
        const participantAction = meventsConstants.GAMIFICATION_CONSTANTS.EVENT_PARTICIPANT_ADDED;
        await gamificationService.awardPoints(
          {
            userId: customerId,
            action: participantAction.action,
            points: participantAction.points || 10,
            metadata: { io, role: 'customer', eventId: event.id, participantCount: participantIds.length },
          },
          transaction
        );
      }
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(201).json({
      status: 'success',
      message: meventsConstants.SUCCESS_MESSAGES.EVENT_CREATED,
      data: { eventId: event.id, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Event creation failed', { error: error.message, customerId });
    return next(new AppError(error.message, 400, 'EVENT_CREATION_FAILED'));
  }
});

const manageGroupBookings = catchAsync(async (req, res, next) => {
  const { eventId, services } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Managing group bookings', { eventId });

  const transaction = await sequelize.transaction();
  try {
    const { event, totalServices, serviceRecords } = await eventService.manageGroupBookings({
      eventId,
      services,
      transaction,
    });

    // Calculate total amount
    let totalAmount = 0;
    for (const record of serviceRecords) {
      if (record.service_type === 'mtables') {
        const booking = await Booking.findByPk(record.service_id, { transaction });
        const inDiningOrder = await InDiningOrder.findOne({
          where: { table_id: booking.table_id },
          include: [{ model: Customer, as: 'customer', where: { user_id: event.customer_id } }],
          transaction,
        });
        if (inDiningOrder) totalAmount += parseFloat(inDiningOrder.total_amount);
      } else if (record.service_type === 'munch') {
        const order = await Order.findByPk(record.service_id, { transaction });
        const payment = await Payment.findOne({ where: { order_id: order.id }, transaction });
        if (payment) totalAmount += parseFloat(payment.amount);
      } else if (record.service_type === 'mtxi') {
        const ride = await Ride.findByPk(record.service_id, { transaction });
        const payment = await Payment.findOne({ where: { id: ride.paymentId }, transaction });
        if (payment) totalAmount += parseFloat(payment.amount);
      } else if (record.service_type === 'in_dining') {
        const inDiningOrder = await InDiningOrder.findByPk(record.service_id, { transaction });
        totalAmount += parseFloat(inDiningOrder.total_amount);
      }
    }

    // Process payments
    const acceptedParticipants = event.participants.filter(
      (p) => p.status === meventsConstants.PARTICIPANT_STATUSES.ACCEPTED
    );
    const participantCount = acceptedParticipants.length;

    if (event.payment_type === meventsConstants.PAYMENT_TYPES.SOLO) {
      const wallet = await Wallet.findOne({ where: { user_id: event.customer_id }, transaction });
      if (!wallet) throw new Error('Wallet not found');
      await walletService.payWithWallet(wallet.id, `event_${eventId}`, totalAmount);
    } else {
      const splitAmount = totalAmount / participantCount;
      for (const participant of acceptedParticipants) {
        const wallet = await Wallet.findOne({ where: { user_id: participant.user_id }, transaction });
        if (!wallet) throw new Error('Wallet not found');
        await walletService.payWithWallet(wallet.id, `event_${eventId}`, splitAmount);

        const user = await User.findByPk(participant.user_id, { transaction });
        const message = formatMessage({
          role: 'customer',
          module: 'mevents',
          languageCode: user.preferred_language,
          messageKey: 'event.bill_split_request',
          params: { amount: splitAmount, currency: wallet.currency, eventTitle: event.title },
        });
        await notificationService.createNotification(
          {
            userId: participant.user_id,
            type: meventsConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST,
            message,
            priority: 'HIGH',
            languageCode: user.preferred_language,
            eventId: event.id,
          },
          transaction
        );
      }
    }

    // Update event status
    await event.update({ status: meventsConstants.EVENT_STATUSES.CONFIRMED }, { transaction });

    // Log audit
    await auditService.logAction(
      {
        userId: event.customer_id,
        logType: meventsConstants.AUDIT_TYPES.BILL_PROCESSED,
        details: { eventId, totalAmount, paymentType: event.payment_type, serviceCount: totalServices },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    await socketService.emit(io, `event:services:${eventId}`, {
      eventId,
      serviceCount: totalServices,
      status: 'confirmed',
    });

    // Award gamification points
    try {
      const action = meventsConstants.GAMIFICATION_CONSTANTS.EVENT_SERVICES_ADDED;
      await gamificationService.awardPoints(
        {
          userId: event.customer_id,
          action: action.action,
          points: action.points || 10,
          metadata: { io, role: 'customer', eventId, serviceCount: totalServices },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: meventsConstants.SUCCESS_MESSAGES.BILL_PROCESSED,
      data: { eventId, serviceCount: totalServices, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Group bookings failed', { error: error.message, eventId });
    return next(new AppError(error.message, 400, 'GROUP_BOOKINGS_FAILED'));
  }
});

const facilitateGroupChat = catchAsync(async (req, res, next) => {
  const { eventId, participantIds } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('io');
  let gamificationError = null;

  logger.info('Facilitating group chat', { eventId });

  const transaction = await sequelize.transaction();
  try {
    const { event, chatRoom, validParticipants } = await eventService.facilitateGroupChat({
      eventId,
      participantIds,
      transaction,
    });

    // Create chat room
    socketService.createRoom(io, chatRoom, participantIds);

    // Notify participants
    for (const participant of validParticipants) {
      const user = await User.findByPk(participant.user_id, { transaction });
      const message = formatMessage({
        role: 'customer',
        module: 'mevents',
        languageCode: user.preferred_language,
        messageKey: 'event.chat_enabled',
        params: { eventTitle: event.title },
      });
      await notificationService.createNotification(
        {
          userId: participant.user_id,
          type: meventsConstants.NOTIFICATION_TYPES.EVENT_CHAT_MESSAGE,
          message,
          priority: 'MEDIUM',
          languageCode: user.preferred_language,
          eventId: event.id,
        },
        transaction
      );
    }

    // Log audit
    await auditService.logAction(
      {
        userId: event.customer_id,
        logType: meventsConstants.AUDIT_TYPES.CHAT_MESSAGE_SENT,
        details: { eventId, participantIds, chatRoom },
        ipAddress,
      },
      transaction
    );

    // Emit socket event
    await socketService.emit(io, `event:chat:${eventId}`, {
      eventId,
      chatRoom,
      participants: participantIds,
    });

    // Award gamification points
    try {
      const action = meventsConstants.GAMIFICATION_CONSTANTS.EVENT_CHAT_ENABLED;
      await gamificationService.awardPoints(
        {
          userId: event.customer_id,
          action: action.action,
          points: action.points || 10,
          metadata: { io, role: 'customer', eventId, chatRoom },
        },
        transaction
      );
    } catch (error) {
      gamificationError = { message: error.message };
    }

    await transaction.commit();

    res.status(200).json({
      status: 'success',
      message: meventsConstants.SUCCESS_MESSAGES.CHAT_ENABLED,
      data: { eventId, chatRoom, gamificationError },
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Group chat facilitation failed', { error: error.message, eventId });
    return next(new AppError(error.message, 400, 'CHAT_FACILITATION_FAILED'));
  }
});

module.exports = {
  createEvent,
  manageGroupBookings,
  facilitateGroupChat,
};