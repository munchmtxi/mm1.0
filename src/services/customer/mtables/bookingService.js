'use strict';

const { Op, sequelize } = require('sequelize');
const {
  Booking,
  Table,
  Customer,
  BookingTimeSlot,
  BookingBlackoutDate,
  Address,
  Feedback,
} = require('@models');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

async function createReservation({ customerId, tableId, branchId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference, transaction }) {
  if (!customerId || !tableId || !branchId || !date || !time || !partySize) {
    throw new Error('Missing required fields');
  }
  if (!dateTimeUtils.isValidDate(date)) {
    throw new Error('Invalid date');
  }
  if (partySize < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY || partySize > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
    throw new Error('Invalid party size');
  }
  if (dietaryPreferences && !dietaryPreferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error('Invalid dietary preferences');
  }
  if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
    throw new Error('Invalid seating preference');
  }

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error('Customer not found');

  const table = await Table.findByPk(tableId, { include: [{ model: sequelize.models.MerchantBranch, as: 'branch' }], transaction });
  if (!table || table.branch_id !== branchId || table.status !== mtablesConstants.TABLE_STATUSES[0]) {
    throw new Error('Table not available');
  }
  if (partySize > table.capacity) {
    throw new Error('Party size exceeds table capacity');
  }

  const blackout = await BookingBlackoutDate.findOne({
    where: {
      branch_id: branchId,
      blackout_date: date,
      is_recurring: false,
      [Op.or]: [{ start_time: null }, { start_time: { [Op.lte]: time }, end_time: { [Op.gte]: time } }],
    },
    transaction,
  });
  if (blackout) throw new Error('Date unavailable due to blackout');

  const bookingDate = dateTimeUtils.parseISO ? new Date(date) : new Date(date);
  const dayOfWeek = bookingDate.getDay();
  const timeSlot = await BookingTimeSlot.findOne({
    where: {
      branch_id: branchId,
      day_of_week: dayOfWeek,
      start_time: { [Op.lte]: time },
      end_time: { [Op.gte]: time },
      is_active: true,
      min_party_size: { [Op.lte]: partySize },
      max_party_size: { [Op.gte]: partySize },
    },
    transaction,
  });
  if (!timeSlot) throw new Error('Time slot unavailable');

  const existingBooking = await Booking.findOne({
    where: {
      table_id: tableId,
      booking_date: date,
      booking_time: time,
      status: { [Op.notIn]: [customerConstants.BOOKING_STATUSES[4], customerConstants.BOOKING_STATUSES[3]] },
    },
    transaction,
  });
  if (existingBooking) throw new Error('Table already booked');

  const activeCount = await Booking.count({
    where: { customer_id: customerId, status: [customerConstants.BOOKING_STATUSES[0], customerConstants.BOOKING_STATUSES[1]] },
    transaction,
  });
  if (activeCount >= mtablesConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS) {
    throw new Error('Maximum bookings reached');
  }

  const reference = `BK-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const checkInCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const booking = await Booking.create(
    {
      customer_id: customerId,
      merchant_id: table.branch.merchant_id,
      branch_id: branchId,
      table_id: tableId,
      reference,
      check_in_code: checkInCode,
      booking_date: date,
      booking_time: time,
      booking_type: mtablesConstants.BOOKING_TYPES[0],
      guest_count: partySize,
      special_requests: specialRequests,
      details: { dietaryPreferences, seatingPreference },
      status: customerConstants.BOOKING_STATUSES[0],
    },
    { transaction }
  );

  await table.update({ status: mtablesConstants.TABLE_STATUSES[1] }, { transaction });

  return { booking, customer, table };
}

async function updateReservation({ bookingId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference, transaction }) {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ model: Table, as: 'table', include: [{ model: sequelize.models.MerchantBranch, as: 'branch' }] }],
    transaction,
  });
  if (!booking || booking.status === customerConstants.BOOKING_STATUSES[4]) {
    throw new Error('Booking not found or cancelled');
  }

  if (partySize && partySize > booking.table.capacity) {
    throw new Error('Invalid party size');
  }
  if (dietaryPreferences && !dietaryPreferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error('Invalid dietary preferences');
  }
  if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
    throw new Error('Invalid seating preference');
  }

  if (date || time) {
    const newDate = date || booking.booking_date;
    const newTime = time || booking.booking_time;
    const dayOfWeek = new Date(newDate).getDay();

    const blackout = await BookingBlackoutDate.findOne({
      where: {
        branch_id: booking.branch_id,
        blackout_date: newDate,
        is_recurring: false,
        [Op.or]: [{ start_time: null }, { start_time: { [Op.lte]: newTime }, end_time: { [Op.gte]: newTime } }],
      },
      transaction,
    });
    if (blackout) throw new Error('Date unavailable due to blackout');

    const timeSlot = await BookingTimeSlot.findOne({
      where: {
        branch_id: booking.branch_id,
        day_of_week: dayOfWeek,
        start_time: { [Op.lte]: newTime },
        end_time: { [Op.gte]: newTime },
        is_active: true,
        min_party_size: { [Op.lte]: partySize || booking.guest_count },
        max_party_size: { [Op.gte]: partySize || booking.guest_count },
      },
      transaction,
    });
    if (!timeSlot) throw new Error('Time slot unavailable');

    const conflictingBooking = await Booking.findOne({
      where: {
        table_id: booking.table_id,
        booking_date: newDate,
        booking_time: newTime,
        id: { [Op.ne]: bookingId },
        status: { [Op.notIn]: [customerConstants.BOOKING_STATUSES[4], customerConstants.BOOKING_STATUSES[3]] },
      },
      transaction,
    });
    if (conflictingBooking) throw new Error('Table not available');
  }

  await booking.update(
    {
      booking_date: date || booking.booking_date,
      booking_time: time || booking.booking_time,
      guest_count: partySize || booking.guest_count,
      special_requests: specialRequests || booking.special_requests,
      details: { ...booking.details, dietaryPreferences: dietaryPreferences || booking.details?.dietaryPreferences, seatingPreference: seatingPreference || booking.details?.seatingPreference },
      booking_modified_at: new Date(),
    },
    { transaction }
  );

  return booking;
}

async function cancelBooking({ bookingId, transaction }) {
  const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }], transaction });
  if (!booking || booking.status === customerConstants.BOOKING_STATUSES[4]) {
    throw new Error('Booking not found or cancelled');
  }

  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
  if ((bookingDateTime - new Date()) / (1000 * 60 * 60) < mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS) {
    throw new Error('Cancellation window expired');
  }

  await booking.update({ status: customerConstants.BOOKING_STATUSES[4], booking_modified_at: new Date() }, { transaction });
  await booking.table.update({ status: mtablesConstants.TABLE_STATUSES[0] }, { transaction });

  await sequelize.models.BookingPartyMember.update(
    { status: 'removed', deleted_at: new Date() },
    { where: { booking_id: bookingId }, transaction }
  );

  return { booking };
}

async function processCheckIn({ bookingId, qrCode, method, coordinates, transaction }) {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ model: sequelize.models.MerchantBranch, as: 'branch', include: [{ model: Address, as: 'address' }] }],
    transaction,
  });
  if (!booking || booking.status !== customerConstants.BOOKING_STATUSES[1]) {
    throw new Error('Invalid booking for check-in');
  }

  if (!mtablesConstants.CHECK_IN_METHODS.includes(method)) {
    throw new Error('Invalid check-in method');
  }
  if (method === mtablesConstants.CHECK_IN_METHODS[0] && qrCode !== booking.check_in_code) {
    throw new Error('Invalid QR code');
  }

  await booking.update({ status: customerConstants.BOOKING_STATUSES[2], check_in_time: new Date() }, { transaction });

  return { booking, coordinates };
}

async function getBookingHistory({ customerId }) {
  if (!customerId) throw new Error('Customer ID required');

  const bookings = await Booking.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Table, as: 'table' },
      { model: sequelize.models.MerchantBranch, as: 'branch', include: [{ model: Address, as: 'address' }] },
    ],
    order: [['booking_date', 'DESC'], ['booking_time', 'DESC']],
  });

  return bookings;
}

async function submitBookingFeedback({ bookingId, rating, comment, transaction }) {
  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking) throw new Error('Booking not found');
  if (rating < mtablesConstants.FEEDBACK_SETTINGS.MIN_RATING || rating > mtablesConstants.FEEDBACK_SETTINGS.MAX_RATING) {
    throw new Error('Invalid rating');
  }

  const feedback = await Feedback.create(
    {
      customer_id: booking.customer_id,
      booking_id: bookingId,
      rating,
      comment,
      is_positive: rating >= mtablesConstants.FEEDBACK_SETTINGS.POSITIVE_RATING_THRESHOLD,
    },
    { transaction }
  );

  return { feedback, booking };
}

async function addPartyMember({ bookingId, friendCustomerId, inviteMethod, transaction }) {
  if (!mtablesConstants.GROUP_SETTINGS.INVITE_METHODS.includes(inviteMethod)) {
    throw new Error('Invalid invite method');
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status === customerConstants.BOOKING_STATUSES[4]) {
    throw new Error('Booking not found or cancelled');
  }

  const friend = await Customer.findByPk(friendCustomerId, { transaction });
  if (!friend) throw new Error('Friend not found');

  const partyMembers = await sequelize.models.BookingPartyMember.findAll({
    where: { booking_id: bookingId, deleted_at: null },
    transaction,
  });
  if (partyMembers.length + 1 > mtablesConstants.GROUP_SETTINGS.MAX_FRIENDS_PER_BOOKING) {
    throw new Error('Maximum friends exceeded');
  }
  if (partyMembers.length + 1 > booking.guest_count) {
    throw new Error('Party size limit exceeded');
  }

  const existingMember = partyMembers.find(member => member.customer_id === friendCustomerId);
  if (existingMember) throw new Error('Friend already added');

  const member = await sequelize.models.BookingPartyMember.create(
    {
      booking_id: bookingId,
      customer_id: friendCustomerId,
      status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[0],
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  return member;
}

async function searchAvailableTables({ coordinates, radius, date, time, partySize, seatingPreference, transaction }) {
  if (!coordinates || !coordinates.lat || !coordinates.lng) {
    throw new Error('Coordinates required');
  }
  if (!dateTimeUtils.isValidDate(date)) {
    throw new Error('Invalid date');
  }
  if (partySize < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY || partySize > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
    throw new Error('Invalid party size');
  }
  if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
    throw new Error('Invalid seating preference');
  }

  const branches = await sequelize.models.MerchantBranch.findAll({
    include: [{ model: Address, as: 'address' }],
    where: sequelize.where(
      sequelize.fn(
        'ST_DWithin',
        sequelize.col('address.location'),
        sequelize.fn('ST_SetSRID', sequelize.fn('ST_MakePoint', coordinates.lng, coordinates.lat), 4326),
        radius
      ),
      true
    ),
    transaction,
  });

  const branchIds = branches.map(branch => branch.id);
  const dayOfWeek = new Date(date).getDay();

  const timeSlots = await BookingTimeSlot.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      day_of_week: dayOfWeek,
      start_time: { [Op.lte]: time },
      end_time: { [Op.gte]: time },
      is_active: true,
      min_party_size: { [Op.lte]: partySize },
      max_party_size: { [Op.gte]: partySize },
    },
    transaction,
  });

  const availableTables = await Table.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      status: mtablesConstants.TABLE_STATUSES[0],
      capacity: { [Op.gte]: partySize },
      ...(seatingPreference && seatingPreference !== 'no_preference' ? { location_type: seatingPreference } : {}),
    },
    include: [{ model: sequelize.models.MerchantBranch, as: 'branch', include: [{ model: Address, as: 'address' }] }],
    transaction,
  });

  const blackoutDates = await BookingBlackoutDate.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      blackout_date: date,
      is_recurring: false,
      [Op.or]: [{ start_time: null }, { start_time: { [Op.lte]: time }, end_time: { [Op.gte]: time } }],
    },
    transaction,
  });

  const bookedTables = await Booking.findAll({
    where: {
      branch_id: { [Op.in]: branchIds },
      booking_date: date,
      booking_time: time,
      status: { [Op.notIn]: [customerConstants.BOOKING_STATUSES[4], customerConstants.BOOKING_STATUSES[3]] },
    },
    transaction,
  });

  const blackoutBranchIds = blackoutDates.map(blackout => blackout.branch_id);
  const bookedTableIds = bookedTables.map(booking => booking.table_id);

  const filteredTables = availableTables.filter(
    table => !blackoutBranchIds.includes(table.branch_id) && !bookedTableIds.includes(table.id)
  );

  return filteredTables;
}

module.exports = {
  createReservation,
  updateReservation,
  cancelBooking,
  processCheckIn,
  getBookingHistory,
  submitBookingFeedback,
  addPartyMember,
  searchAvailableTables,
};