'use strict';

const { sequelize, Event, EventParticipant, EventService, User, Order, Booking, Ride, InDiningOrder, Payment, Wallet } = require('@models');
const meventsConstants = require('@constants/merchant/meventsConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function createEvent(eventId, details, ipAddress, transaction = null) {
  const { merchantId, title, description, occasion, paymentType, participantIds = [] } = details;
  try {
    if (!Object.values(meventsConstants.EVENT_OCCASIONS).includes(occasion)) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidOccasion'), 400, meventsConstants.ERROR_CODES.INVALID_EVENT);
    }
    if (!Object.values(meventsConstants.PAYMENT_TYPES).includes(paymentType)) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidPaymentType'), 400, meventsConstants.ERROR_CODES.INVALID_PAYMENT_TYPE);
    }
    if (title.length > meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidTitle'), 400, meventsConstants.ERROR_CODES.INVALID_EVENT);
    }
    if (description && description.length > meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidDescription'), 400, meventsConstants.ERROR_CODES.INVALID_EVENT);
    }
    if (participantIds.length > meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.maxParticipantsExceeded'), 400, meventsConstants.ERROR_CODES.MAX_PARTICIPANTS_EXCEEDED);
    }

    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      transaction,
    });
    if (!merchant) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidMerchant'), 404, meventsConstants.ERROR_CODES.INVALID_CUSTOMER);
    }

    const participants = await User.findAll({
      where: { id: participantIds },
      attributes: ['id', 'preferred_language'],
      transaction,
    });
    if (participants.length !== participantIds.length) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidParticipant'), 400, meventsConstants.ERROR_CODES.INVALID_PARTICIPANT);
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

    logger.info(`Event ${event.id} created for merchant ${merchantId}`);
    return {
      eventId: event.id,
      title,
      participantCount: participantIds.length,
      language: merchant.preferred_language || 'en',
      action: 'eventCreated',
    };
  } catch (error) {
    throw handleServiceError('createEvent', error, meventsConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function manageGroupBookings(eventId, bookings, ipAddress, transaction = null) {
  const { orders = [], mtablesBookings = [], rides = [], inDiningOrders = [] } = bookings;
  try {
    const event = await Event.findByPk(eventId, {
      include: [{ model: EventParticipant, as: 'participants' }],
      transaction,
    });
    if (!event || event.status === meventsConstants.EVENT_STATUSES.CANCELLED) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.eventNotFound'), 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
    }

    const totalServices = orders.length + mtablesBookings.length + rides.length + inDiningOrders.length;
    if (totalServices > meventsConstants.EVENT_SETTINGS.MAX_SERVICES) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.maxServicesExceeded'), 400, meventsConstants.ERROR_CODES.MAX_SERVICES_EXCEEDED);
    }

    const serviceRecords = [];
    for (const orderId of orders) {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order || order.customer_id !== event.customer_id) {
        throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
      }
      serviceRecords.push({ event_id: eventId, service_id: orderId, service_type: 'munch' });
    }
    for (const bookingId of mtablesBookings) {
      const booking = await Booking.findByPk(bookingId, { transaction });
      if (!booking || booking.customer_id !== event.customer_id) {
        throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
      }
      serviceRecords.push({ event_id: eventId, service_id: bookingId, service_type: 'mtables' });
    }
    for (const rideId of rides) {
      const ride = await Ride.findByPk(rideId, { transaction });
      if (!ride || ride.customer_id !== event.customer_id) {
        throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
      }
      serviceRecords.push({ event_id: eventId, service_id: rideId, service_type: 'mtxi' });
    }
    for (const inDiningOrderId of inDiningOrders) {
      const inDiningOrder = await InDiningOrder.findByPk(inDiningOrderId, { transaction });
      if (!inDiningOrder || inDiningOrder.customer_id !== event.customer_id) {
        throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidService'), 400, meventsConstants.ERROR_CODES.INVALID_SERVICE);
      }
      serviceRecords.push({ event_id: eventId, service_id: inDiningOrderId, service_type: 'in_dining' });
    }

    await EventService.bulkCreate(serviceRecords, { transaction });

    let totalAmount = 0;
    for (const record of serviceRecords) {
      if (record.service_type === 'mtables') {
        const booking = await Booking.findByPk(record.service_id, { transaction });
        const inDiningOrder = await InDiningOrder.findOne({
          where: { table_id: booking.table_id },
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

    await event.update({ status: meventsConstants.EVENT_STATUSES.CONFIRMED }, { transaction });

    logger.info(`Managed ${totalServices} bookings for event ${eventId}`);
    return {
      eventId,
      serviceCount: totalServices,
      totalAmount,
      language: (await User.findByPk(event.customer_id, { attributes: ['preferred_language'], transaction })).preferred_language || 'en',
      action: 'groupBookingsManaged',
    };
  } catch (error) {
    throw handleServiceError('manageGroupBookings', error, meventsConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

async function facilitateGroupChat(eventId, participants, ipAddress, transaction = null) {
  try {
    const event = await Event.findByPk(eventId, {
      include: [{ model: EventParticipant, as: 'participants' }],
      transaction,
    });
    if (!event) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.eventNotFound'), 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
    }

    const validParticipants = event.participants.filter(p => participants.includes(p.user_id) && p.status === meventsConstants.PARTICIPANT_STATUSES.ACCEPTED);
    if (validParticipants.length !== participants.length) {
      throw new AppError(formatMessage('merchant', 'mevents', 'en', 'mevents.errors.invalidParticipant'), 400, meventsConstants.ERROR_CODES.INVALID_PARTICIPANT);
    }

    const chatRoom = `event:chat:${eventId}`;

    logger.info(`Group chat facilitated for event ${eventId}`);
    return {
      eventId,
      chatRoom,
      participantCount: participants.length,
      language: (await User.findByPk(event.customer_id, { attributes: ['preferred_language'], transaction })).preferred_language || 'en',
      action: 'groupChatFacilitated',
    };
  } catch (error) {
    throw handleServiceError('facilitateGroupChat', error, meventsConstants.ERROR_CODES.SYSTEM_ERROR);
  }
}

module.exports = { createEvent, manageGroupBookings, facilitateGroupChat };