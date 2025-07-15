'use strict';

const { sequelize } = require('@models');
const {
  Booking,
  Order,
  Ride,
  InDiningOrder,
  ParkingBooking,
  ParkingSpace,
  User,
  Customer,
  Event,
  EventService,
  EventParticipant,
  MenuInventory,
  Table,
  TableLayoutSection,
} = require('@models');
const meventsConstants = require('@constants/meventsConstants');

async function createEvent({ customerId, title, description, occasion, paymentType, participantIds = [], selectedMenuItems = [], selectedTables = [], transaction }) {
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

  // Validate menu items
  const menuItems = await MenuInventory.findAll({
    where: { id: selectedMenuItems, availability_status: 'in-stock' },
    attributes: ['id', 'name', 'price'],
    transaction,
  });
  if (menuItems.length !== selectedMenuItems.length) {
    throw new Error('Invalid or unavailable menu item');
  }

  // Validate tables
  const tables = await Table.findAll({
    where: { id: selectedTables, status: 'available' },
    include: [{ model: TableLayoutSection, as: 'section', attributes: ['id', 'name', 'location_type'] }],
    transaction,
  });
  if (tables.length !== selectedTables.length) {
    throw new Error('Invalid or unavailable table');
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
      metadata: { selectedMenuItems, selectedTables },
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

  // Reserve tables
  await Table.update(
    { status: 'reserved' },
    { where: { id: selectedTables }, transaction }
  );

  return { event, customer, participants, menuItems, tables };
}

async function manageGroupBookings({ eventId, services, transaction }) {
  const { bookings = [], orders = [], rides = [], inDiningOrders = [], parkingBookings = [] } = services;

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
  const totalServices = bookings.length + orders.length + rides.length + inDiningOrders.length + parkingBookings.length;
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

  for (const parkingBookingId of parkingBookings) {
    const parkingBooking = await ParkingBooking.findByPk(parkingBookingId, {
      include: [{ model: ParkingSpace, as: 'space', attributes: ['id', 'status'] }],
      transaction,
    });
    if (!parkingBooking || parkingBooking.customer_id !== event.customer_id || parkingBooking.space.status !== 'AVAILABLE') {
      throw new Error('Invalid or unavailable parking booking');
    }
    serviceRecords.push({ event_id: eventId, service_id: parkingBookingId, service_type: 'mpark' });
  }

  // Add services to event
  await EventService.bulkCreate(serviceRecords, { transaction });

  // Update parking space status to RESERVED
  const parkingSpaceIds = await Promise.all(
    parkingBookings.map(async (id) => {
      const booking = await ParkingBooking.findByPk(id, { transaction });
      return booking.space_id;
    })
  );
  if (parkingSpaceIds.length > 0) {
    await ParkingSpace.update(
      { status: 'RESERVED' },
      { where: { id: parkingSpaceIds }, transaction }
    );
  }

  return { event, totalServices, serviceRecords };
}

async function facilitateGroupChat({ eventId, participantIds, transaction }) {
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
}

async function amendEvent({
  eventId,
  customerId,
  title,
  description,
  occasion,
  paymentType,
  participantIds = [],
  selectedMenuItems = [],
  selectedTables = [],
  services = { bookings: [], orders: [], rides: [], inDiningOrders: [], parkingBookings: [] },
  transaction,
}) {
  // Validate event and customer
  const event = await Event.findByPk(eventId, {
    include: [
      { model: EventParticipant, as: 'participants' },
      { model: EventService, as: 'services' },
    ],
    transaction,
  });
  if (!event) throw new Error('Event not found');
  if (event.customer_id !== customerId) throw new Error('Unauthorized: Only the event creator can amend');
  if (event.status === meventsConstants.EVENT_STATUSES.CANCELLED || event.status === meventsConstants.EVENT_STATUSES.COMPLETED) {
    throw new Error('Cannot amend cancelled or completed event');
  }

  // Validate inputs (if provided)
  if (occasion && !Object.values(meventsConstants.EVENT_OCCASIONS).includes(occasion)) {
    throw new Error('Invalid occasion');
  }
  if (paymentType && !Object.values(meventsConstants.PAYMENT_TYPES).includes(paymentType)) {
    throw new Error('Invalid payment type');
  }
  if (title && title.length > meventsConstants.EVENT_SETTINGS.MAX_TITLE_LENGTH) {
    throw new Error('Title too long');
  }
  if (description && description.length > meventsConstants.EVENT_SETTINGS.MAX_DESCRIPTION_LENGTH) {
    throw new Error('Description too long');
  }
  if (participantIds.length > meventsConstants.EVENT_SETTINGS.MAX_PARTICIPANTS) {
    throw new Error('Maximum participants exceeded');
  }

  // Validate participants
  let participants = event.participants;
  if (participantIds.length > 0) {
    participants = await User.findAll({
      where: { id: participantIds },
      attributes: ['id', 'preferred_language', 'notification_preferences'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    });
    if (participants.length !== participantIds.length) {
      throw new Error('Invalid participant');
    }

    // Update participants
    await EventParticipant.destroy({ where: { event_id: eventId, user_id: { [sequelize.Op.ne]: customerId } }, transaction });
    const participantRecords = participantIds.map((userId) => ({
      event_id: eventId,
      user_id: userId,
      status: meventsConstants.PARTICIPANT_STATUSES.INVITED,
    }));
    await EventParticipant.bulkCreate(participantRecords, { transaction });
  }

  // Validate and update menu items
  let menuItems = [];
  if (selectedMenuItems.length > 0) {
    menuItems = await MenuInventory.findAll({
      where: { id: selectedMenuItems, availability_status: 'in-stock' },
      attributes: ['id', 'name', 'price'],
      transaction,
    });
    if (menuItems.length !== selectedMenuItems.length) {
      throw new Error('Invalid or unavailable menu item');
    }
  }

  // Validate and update tables
  let tables = [];
  if (selectedTables.length > 0) {
    tables = await Table.findAll({
      where: { id: selectedTables, status: 'available' },
      include: [{ model: TableLayoutSection, as: 'section', attributes: ['id', 'name', 'location_type'] }],
      transaction,
    });
    if (tables.length !== selectedTables.length) {
      throw new Error('Invalid or unavailable table');
    }
    // Release previously reserved tables
    const prevTables = event.metadata?.selectedTables || [];
    await Table.update(
      { status: 'available' },
      { where: { id: prevTables, status: 'reserved' }, transaction }
    );
    // Reserve new tables
    await Table.update(
      { status: 'reserved' },
      { where: { id: selectedTables }, transaction }
    );
  }

  // Validate and update services
  const { bookings = [], orders = [], rides = [], inDiningOrders = [], parkingBookings = [] } = services;
  const totalServices = bookings.length + orders.length + rides.length + inDiningOrders.length + parkingBookings.length;
  if (totalServices > meventsConstants.EVENT_SETTINGS.MAX_SERVICES) {
    throw new Error('Maximum services exceeded');
  }

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
  for (const parkingBookingId of parkingBookings) {
    const parkingBooking = await ParkingBooking.findByPk(parkingBookingId, {
      include: [{ model: ParkingSpace, as: 'space', attributes: ['id', 'status'] }],
      transaction,
    });
    if (!parkingBooking || parkingBooking.customer_id !== event.customer_id || parkingBooking.space.status !== 'AVAILABLE') {
      throw new Error('Invalid or unavailable parking booking');
    }
    serviceRecords.push({ event_id: eventId, service_id: parkingBookingId, service_type: 'mpark' });
  }

  // Release previous parking spaces
  const prevParkingServices = event.services.filter((s) => s.service_type === 'mpark');
  const prevParkingSpaceIds = await Promise.all(
    prevParkingServices.map(async (s) => {
      const booking = await ParkingBooking.findByPk(s.service_id, { transaction });
      return booking ? booking.space_id : null;
    })
  );
  if (prevParkingSpaceIds.length > 0) {
    await ParkingSpace.update(
      { status: 'AVAILABLE' },
      { where: { id: prevParkingSpaceIds.filter((id) => id) }, transaction }
    );
  }

  // Update parking spaces to RESERVED
  const newParkingSpaceIds = await Promise.all(
    parkingBookings.map(async (id) => {
      const booking = await ParkingBooking.findByPk(id, { transaction });
      return booking.space_id;
    })
  );
  if (newParkingSpaceIds.length > 0) {
    await ParkingSpace.update(
      { status: 'RESERVED' },
      { where: { id: newParkingSpaceIds }, transaction }
    );
  }

  // Update event services
  await EventService.destroy({ where: { event_id: eventId }, transaction });
  await EventService.bulkCreate(serviceRecords, { transaction });

  // Update event details
  const updates = {};
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (occasion) updates.occasion = occasion;
  if (paymentType) updates.payment_type = paymentType;
  if (selectedMenuItems.length > 0 || selectedTables.length > 0) {
    updates.metadata = { selectedMenuItems, selectedTables };
  }

  await event.update(updates, { transaction });

  return {
    event,
    customer: await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language', 'notification_preferences'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      transaction,
    }),
    participants,
    menuItems,
    tables,
    services: serviceRecords,
  };
}

// Named exports at the end
module.exports = {
  createEvent,
  manageGroupBookings,
  facilitateGroupChat,
  amendEvent,
};