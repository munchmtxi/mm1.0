'use strict';

const { sequelize } = require('@models');
const {
  Booking,
  Order,
  Ride,
  InDiningOrder,
  User,
  Customer,
  Event,
  EventService,
  EventParticipant,
} = require('@models');
const meventsConstants = require('@constants/meventsConstants');

const eventService = {
  async createEvent({ customerId, title, description, occasion, paymentType, participantIds = [], transaction }) {
    // Validate inputs
    if (!Object.values(meventsConstants.EVENT_OCCASIONS).includes(occasion)) {
      throw new Error('Invalid occasion');
    }
    if (!Object.values(meventsConstants.PAYMENT_TYPES).includes(paymentType)) {
      throw new Error('Invalid payment type');
    }
    if (title.length > meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH) {
      throw new Error('Title too long');
    }
    if (description && description.length > meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH) {
      throw new Error('Description too long');
    }
    if (participantIds.length > meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS) {
      throw new Error('Maximum participants exceeded');
    }

    // Validate customer
    const customer = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language', 'notification_preferences'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    });
    if (!customer) throw new Error('Customer not found');

    // Validate participants
    const participants = await User.findAll({
      where: { id: participantIds },
      attributes: ['id', 'preferred_language', 'notification_preferences'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    });
    if (participants.length !== participantIds.length) {
      throw new Error('Invalid participant');
    }

    // Create event
    const event = await Event.create(
      {
        customer_id: customerId,
        title,
        description,
        occasion,
        payment_type: paymentType,
        status: meventsConstants.EVENT_STATUSES.DRAFT,
      },
      { transaction }
    );

    // Add participants
    const participantRecords = [
      { event_id: event.id, user_id: customerId, status: meventsConstants.PARTICIPANT_STATUSES.ACCEPTED },
      ...participantIds.map((userId) => ({
        event_id: event.id,
        user_id: userId,
        status: meventsConstants.PARTICIPANT_STATUSES.INVITED,
      })),
    ];
    await EventParticipant.bulkCreate(participantRecords, { transaction });

    return { event, customer, participants };
  },

  async manageGroupBookings({ eventId, services, transaction }) {
    const { bookings = [], orders = [], rides = [], inDiningOrders = [] } = services;

    // Validate event
    const event = await Event.findByPk(eventId, {
      include: [{ model: EventParticipant, as: 'participants' }],
      transaction,
    });
    if (!event) throw new Error('Event not found');
    if (event.status === meventsConstants.EVENT_STATUSES.CANCELLED) {
      throw new Error('Event cancelled');
    }

    // Validate service counts
    const totalServices = bookings.length + orders.length + rides.length + inDiningOrders.length;
    if (totalServices > meventsConstants.EVENT_SETTINGS.MAX_SERVICES) {
      throw new Error('Maximum services exceeded');
    }

    // Validate services
    const serviceRecords = [];

    for (const bookingId of bookings) {
      const booking = await Booking.findByPk(bookingId, { transaction });
      if (!booking || booking.customer_id !== event.customer_id) {
        throw new Error('Invalid booking');
      }
      serviceRecords.push({ event_id: eventId, service_id: bookingId, service_type: 'mtables' });
    }

    for (const orderId of orders) {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order || order.customer_id !== event.customer_id) {
        throw new Error('Invalid order');
      }
      serviceRecords.push({ event_id: eventId, service_id: orderId, service_type: 'munch' });
    }

    for (const rideId of rides) {
      const ride = await Ride.findByPk(rideId, { transaction });
      if (!ride || ride.customerId !== event.customer_id) {
        throw new Error('Invalid ride');
      }
      serviceRecords.push({ event_id: eventId, service_id: rideId, service_type: 'mtxi' });
    }

    for (const inDiningOrderId of inDiningOrders) {
      const inDiningOrder = await InDiningOrder.findByPk(inDiningOrderId, {
        include: [{ model: Customer, as: 'customer', attributes: ['user_id'] }],
        transaction,
      });
      if (!inDiningOrder || inDiningOrder.customer.user_id !== event.customer_id) {
        throw new Error('Invalid in-dining order');
      }
      serviceRecords.push({ event_id: eventId, service_id: inDiningOrderId, service_type: 'in_dining' });
    }

    // Add services to event
    await EventService.bulkCreate(serviceRecords, { transaction });

    return { event, totalServices, serviceRecords };
  },

  async facilitateGroupChat({ eventId, participantIds, transaction }) {
    // Validate event
    const event = await Event.findByPk(eventId, {
      include: [{ model: EventParticipant, as: 'participants' }],
      transaction,
    });
    if (!event) throw new Error('Event not found');

    // Validate participants
    const validParticipants = event.participants.filter(
      (p) => participantIds.includes(p.user_id) && p.status === meventsConstants.PARTICIPANT_STATUSES.ACCEPTED
    );
    if (validParticipants.length !== participantIds.length) {
      throw new Error('Invalid participant');
    }

    const chatRoom = `event:chat:${eventId}`;
    return { event, chatRoom, validParticipants };
  },
};

module.exports = eventService;