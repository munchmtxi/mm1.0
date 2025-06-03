// src/services/events/eventManagementService.js
'use strict';

const { sequelize, Event, EventParticipant, EventService, Customer, User, Order, Booking, Ride, InDiningOrder, Payment, Wallet } = require('@models');
const meventsConstants = require('@constants/meventsConstants');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const walletService = require('@services/common/walletService');
const paymentConstants = require('@constants/paymentConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

class EventManagementService {
  static async createEvent(eventId, details, ipAddress) {
    const { merchantId, title, description, occasion, paymentType, participantIds = [] } = details;
    const transaction = await sequelize.transaction();

    try {
      if (!Object.values(meventsConstants.EVENT_OCCASIONS).includes(occasion)) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidEvent'), 400, meventsConstants.ERROR_CODES.INVALID_EVENT);
      }
      if (!Object.values(meventsConstants.PAYMENT_TYPES).includes(paymentType)) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidPaymentType'), 400, meventsConstants.ERROR_CODES.INVALID_PAYMENT_TYPE);
      }
      if (title.length > meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidEvent'), 400, meventsConstants.ERROR_CODES.INVALID_EVENT);
      }
      if (description && description.length > meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidEvent'), 400, meventsConstants.ERROR_CODES.INVALID_EVENT);
      }
      if (participantIds.length > meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.maxParticipantsExceeded'), 400, meventsConstants.ERROR_CODES.MAX_PARTICIPANTS_EXCEEDED);
      }

      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language', 'notification_preferences'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidMerchant'), 404, meventsConstants.ERROR_CODES.INVALID_CUSTOMER);
      }

      const participants = await User.findAll({
        where: { id: participantIds },
        attributes: ['id', 'preferred_language', 'notification_preferences'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (participants.length !== participantIds.length) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidParticipant'), 400, meventsConstants.ERROR_CODES.INVALID_PARTICIPANT);
      }

      const event = await Event.create({
        customer_id: merchantId,
        title,
        description,
        occasion,
        payment_type: paymentType,
        status: meventsConstants.EVENT_STATUSES.DRAFT,
      }, { transaction });

      const participantRecords = [
        { event_id: event.id, user_id: merchantId, status: meventsConstants.PARTICIPANT_STATUSES.ACCEPTED },
        ...participantIds.map(userId => ({
          event_id: event.id,
          user_id: userId,
          status: meventsConstants.PARTICIPANT_STATUSES.INVITED,
        })),
      ];
      await EventParticipant.bulkCreate(participantRecords, { transaction });

      await gamificationService.awardPoints({
        userId: merchantId,
        action: meventsConstants.GAMIFICATION_CONSTANTS.EVENT_CREATED.action,
        points: meventsConstants.GAMIFICATION_CONSTANTS.EVENT_CREATED.points,
        metadata: { eventId: event.id, occasion },
      }, transaction);

      if (participantIds.length > 0) {
        await gamificationService.awardPoints({
          userId: merchantId,
          action: meventsConstants.GAMIFICATION_CONSTANTS.EVENT_PARTICIPANT_ADDED.action,
          points: meventsConstants.GAMIFICATION_CONSTANTS.EVENT_PARTICIPANT_ADDED.points,
          metadata: { eventId: event.id, participantCount: participantIds.length },
        }, transaction);
      }

      const creatorMessage = formatMessage(merchant.preferred_language, 'eventManagement.eventCreated', { title });
      await notificationService.createNotification({
        userId: merchantId,
        type: meventsConstants.NOTIFICATION_TYPES.EVENT_CREATED,
        message: creatorMessage,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
        eventId: event.id,
      }, transaction);

      for (const participant of participants) {
        const message = formatMessage(participant.preferred_language, 'eventManagement.invitation', {
          title,
          creatorId: merchantId,
        });
        await notificationService.createNotification({
          userId: participant.id,
          type: meventsConstants.NOTIFICATION_TYPES.EVENT_INVITATION,
          message,
          priority: 'HIGH',
          languageCode: participant.preferred_language,
          eventId: event.id,
        }, transaction);
      }

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: meventsConstants.AUDIT_TYPES.EVENT_CREATED,
        details: { eventId: event.id, title, occasion, paymentType, participantIds },
        ipAddress,
      }, transaction);

      socketService.emit(`event:created:${merchantId}`, { eventId: event.id, title, status: event.status });

      await transaction.commit();
      logger.info(`Event ${event.id} created for merchant ${merchantId}`);
      return { eventId: event.id };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('createEvent', error, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
    }
  }

  static async manageGroupBookings(eventId, bookings, ipAddress) {
    const { orders = [], mtablesBookings = [], rides = [], inDiningOrders = [] } = bookings;
    const transaction = await sequelize.transaction();

    try {
      const event = await Event.findByPk(eventId, {
        include: [{ model: EventParticipant, as: 'participants' }],
        transaction,
      });
      if (!event || event.status === meventsConstants.EVENT_STATUSES.CANCELLED) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.eventNotFound'), 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
      }

      const totalServices = orders.length + mtablesBookings.length + rides.length + inDiningOrders.length;
      if (totalServices > meventsConstants.EVENT_SETTINGS.MAX_SERVICES) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.maxServicesExceeded'), 400, meventsConstants.ERROR_CODES.MAX_SERVICES_EXCEEDED);
      }

      const serviceRecords = [];
      for (const orderId of orders) {
        const order = await Order.findByPk(orderId, { include: [{ model: Customer, as: 'customer' }], transaction });
        if (!order || order.customer.user_id !== event.customer_id) {
          throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
        }
        serviceRecords.push({ event_id: eventId, service_id: orderId, service_type: 'munch' });
      }
      for (const bookingId of mtablesBookings) {
        const booking = await Booking.findByPk(bookingId, { include: [{ model: Customer, as: 'customer' }], transaction });
        if (!booking || booking.customer.user_id !== event.customer_id) {
          throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
        }
        serviceRecords.push({ event_id: eventId, service_id: bookingId, service_type: 'mtables' });
      }
      for (const rideId of rides) {
        const ride = await Ride.findByPk(rideId, { transaction });
        if (!ride || ride.customerId !== event.customer_id) {
          throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
        }
        serviceRecords.push({ event_id: eventId, service_id: rideId, service_type: 'mtxi' });
      }
      for (const inDiningOrderId of inDiningOrders) {
        const inDiningOrder = await InDiningOrder.findByPk(inDiningOrderId, { include: [{ model: Customer, as: 'customer' }], transaction });
        if (!inDiningOrder || inDiningOrder.customer.user_id !== event.customer_id) {
          throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
        }
        serviceRecords.push({ event_id: eventId, service_id: inDiningOrderId, service_type: 'in_dining' });
      }

      await EventService.bulkCreate(serviceRecords, { transaction });

      const acceptedParticipants = event.participants.filter(p => p.status === meventsConstants.PARTICIPANT_STATUSES.ACCEPTED);
      const participantCount = acceptedParticipants.length;
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

      if (event.payment_type === meventsConstants.PAYMENT_TYPES.SOLO) {
        const wallet = await Wallet.findOne({ where: { user_id: event.customer_id }, transaction });
        if (!wallet || wallet.balance < totalAmount) {
          throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.insufficientFunds'), 400, meventsConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
        }
        await walletService.processTransaction({
          walletId: wallet.id,
          amount: totalAmount,
          type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
          currency: wallet.currency,
          description: `Payment for event ${event.id}`,
        }, transaction);
      } else {
        const splitAmount = totalAmount / participantCount;
        for (const participant of acceptedParticipants) {
          const wallet = await Wallet.findOne({ where: { user_id: participant.user_id }, transaction });
          if (!wallet || wallet.balance < splitAmount) {
            throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.insufficientFunds'), 400, meventsConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
          }
          await walletService.processTransaction({
            walletId: wallet.id,
            amount: splitAmount,
            type: paymentConstants.TRANSACTION_TYPES.PAYMENT,
            currency: wallet.currency,
            description: `Split payment for event ${event.id}`,
          }, transaction);
          const user = await User.findByPk(participant.user_id, { transaction });
          const message = formatMessage(user.preferred_language, 'eventManagement.billSplitRequest', {
            amount: splitAmount,
            currency: wallet.currency,
            eventTitle: event.title,
          });
          await notificationService.createNotification({
            userId: participant.user_id,
            type: meventsConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST,
            message,
            priority: 'HIGH',
            languageCode: user.preferred_language,
            eventId: event.id,
          }, transaction);
        }
      }

      await event.update({ status: meventsConstants.EVENT_STATUSES.CONFIRMED }, { transaction });

      await auditService.logAction({
        userId: event.customer_id,
        role: 'merchant',
        action: meventsConstants.AUDIT_TYPES.BILL_PROCESSED,
        details: { eventId, totalAmount, paymentType: event.payment_type, serviceCount: totalServices },
        ipAddress,
      }, transaction);

      socketService.emit(`event:services:${eventId}`, { eventId, serviceCount: totalServices, status: 'confirmed' });

      await transaction.commit();
      logger.info(`Managed ${totalServices} bookings for event ${eventId}`);
      return { eventId, serviceCount: totalServices };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('manageGroupBookings', error, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
    }
  }

  static async facilitateGroupChat(eventId, participants, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const event = await Event.findByPk(eventId, { include: [{ model: EventParticipant, as: 'participants' }], transaction });
      if (!event) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.eventNotFound'), 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
      }

      const validParticipants = event.participants.filter(p => participants.includes(p.user_id) && p.status === meventsConstants.PARTICIPANT_STATUSES.ACCEPTED);
      if (validParticipants.length !== participants.length) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidParticipant'), 400, meventsConstants.ERROR_CODES.INVALID_PARTICIPANT);
      }

      const chatRoom = `event:chat:${eventId}`;
      socketService.createRoom(chatRoom, participants);

      for (const participant of validParticipants) {
        const user = await User.findByPk(participant.user_id, { transaction });
        const message = formatMessage(user.preferred_language, 'eventManagement.chatEnabled', { eventTitle: event.title });
        await notificationService.createNotification({
          userId: participant.user_id,
          type: meventsConstants.NOTIFICATION_TYPES.EVENT_CHAT_MESSAGE,
          message,
          priority: 'MEDIUM',
          languageCode: user.preferred_language,
          eventId: event.id,
        }, transaction);
      }

      await auditService.logAction({
        userId: event.customer_id,
        role: 'merchant',
        action: meventsConstants.AUDIT_TYPES.CHAT_MESSAGE_SENT,
        details: { eventId, participantIds: participants, chatRoom },
        ipAddress,
      }, transaction);

      socketService.emit(`event:chat:${eventId}`, { eventId, chatRoom, participants });

      await transaction.commit();
      logger.info(`Group chat facilitated for event ${eventId}`);
      return { eventId, chatRoom };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('facilitateGroupChat', error, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
    }
  }

  static async trackEventGamification(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }] });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'events', 'en', 'eventManagement.errors.invalidCustomer'), 404, meventsConstants.ERROR_CODES.INVALID_CUSTOMER);
      }

      const events = await Event.findAll({ where: { customer_id: customerId, status: meventsConstants.EVENT_STATUSES.COMPLETED } });
      const points = events.length * meventsConstants.GAMIFICATION_CONSTANTS.EVENT_COMPLETED.points;

      await gamificationService.awardPoints({
        userId: customerId,
        action: meventsConstants.GAMIFICATION_CONSTANTS.EVENT_COMPLETED.action,
        points,
        metadata: { eventCount: events.length },
      });

      const message = formatMessage(customer.preferred_language, 'eventManagement.pointsAwarded', { points });
      await notificationService.createNotification({
        userId: customerId,
        type: meventsConstants.NOTIFICATION_TYPES.EVENT_UPDATED,
        message,
        priority: 'LOW',
        languageCode: customer.preferred_language,
      });

      await auditService.logAction({
        userId: customerId,
        role: 'merchant',
        action: meventsConstants.AUDIT_TYPES.EVENT_UPDATED,
        details: { customerId, pointsAwarded: points, eventCount: events.length },
        ipAddress,
      });

      socketService.emit(`event:gamification:${customerId}`, { customerId, points });

      logger.info(`Gamification tracked for customer ${customerId}: ${points} points`);
      return { customerId, points };
    } catch (error) {
      throw handleServiceError('trackEventGamification', error, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
    }
  }
}

module.exports = EventManagementService;