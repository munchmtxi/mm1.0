'use strict';

const { Op } = require('sequelize');
const {
  Booking,
  Table,
  Customer,
  BookingTimeSlot,
  BookingBlackoutDate,
  Address,
  Review,
  MerchantBranch,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

async function createReservation({ customerId, tableId, branchId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference, transaction }) {
  if (!customerId || !tableId || !branchId || !date || !time || !partySize) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }
  if (!dateTimeUtils.isValidDate(date)) {
    throw new Error(mtablesConstants.ERROR_TYPES[4]); // INVALID_BOOKING_DETAILS
  }
  if (partySize < mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY || partySize > mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY) {
    throw new Error(mtablesConstants.ERROR_TYPES[5]); // INVALID_PARTY_SIZE
  }
  if (dietaryPreferences && !dietaryPreferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error(mtablesConstants.ERROR_TYPES[11]); // INVALID_DIETARY_FILTER
  }
  if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
    throw new Error(mtablesConstants.ERROR_TYPES[6]); // INVALID_SEATING_PREFERENCE
  }

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new Error(mtablesConstants.ERROR_TYPES[10]); // INVALID_CUSTOMER_ID

  const table = await Table.findByPk(tableId, { include: [{ model: MerchantBranch, as: 'branch' }], transaction });
  if (!table || table.branch_id !== branchId || table.status !== mtablesConstants.TABLE_STATUSES[0]) {
    throw new Error(mtablesConstants.ERROR_TYPES[6]); // TABLE_NOT_AVAILABLE
  }
  if (partySize > table.capacity) {
    throw new Error(mtablesConstants.ERROR_TYPES[5]); // INVALID_PARTY_SIZE
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
  if (blackout) throw new Error(mtablesConstants.ERROR_TYPES[4]); // INVALID_BOOKING_DETAILS

  const bookingDate = new Date(date);
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
  if (!timeSlot) throw new Error(mtablesConstants.ERROR_TYPES[4]); // INVALID_BOOKING_DETAILS

  const existingBooking = await Booking.findOne({
    where: {
      table_id: tableId,
      booking_date: date,
      booking_time: time,
      status: { [Op.notIn]: [customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4], customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[5]] },
    },
    transaction,
  });
  if (existingBooking) throw new Error(mtablesConstants.ERROR_TYPES[6]); // TABLE_NOT_AVAILABLE

  const activeCount = await Booking.count({
    where: { customer_id: customerId, status: [customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[0], customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[1]] },
    transaction,
  });
  if (activeCount >= mtablesConstants.CUSTOMER_SETTINGS.MAX_ACTIVE_BOOKINGS) {
    throw new Error(mtablesConstants.ERROR_TYPES[12]); // MAX_BOOKINGS_EXCEEDED
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
      status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[1],
      seating_preference: seatingPreference || 'no_preference',
    },
    { transaction }
  );

  await table.update({ status: mtablesConstants.TABLE_STATUSES[1] }, { transaction });

  return { booking, customer, table };
}

async function updateReservation({ bookingId, date, time, partySize, dietaryPreferences, specialRequests, seatingPreference, transaction }) {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch' }] }],
    transaction,
  });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  if (partySize && partySize > booking.table.capacity) {
    throw new Error(mtablesConstants.ERROR_TYPES[5]); // INVALID_PARTY_SIZE
  }
  if (dietaryPreferences && !dietaryPreferences.every(pref => mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error(mtablesConstants.ERROR_TYPES[11]); // INVALID_DIETARY_FILTER
  }
  if (seatingPreference && !mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES.includes(seatingPreference)) {
    throw new Error(mtablesConstants.ERROR_TYPES[6]); // INVALID_SEATING_PREFERENCE
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
    if (blackout) throw new Error(mtablesConstants.ERROR_TYPES[4]); // INVALID_BOOKING_DETAILS

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
    if (!timeSlot) throw new Error(mtablesConstants.ERROR_TYPES[4]); // INVALID_BOOKING_DETAILS

    const conflictingBooking = await Booking.findOne({
      where: {
        table_id: booking.table_id,
        booking_date: newDate,
        booking_time: newTime,
        id: { [Op.ne]: bookingId },
        status: { [Op.notIn]: [customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4], customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[5]] },
      },
      transaction,
    });
    if (conflictingBooking) throw new Error(mtablesConstants.ERROR_TYPES[6]); // TABLE_NOT_AVAILABLE
  }

  await booking.update(
    {
      booking_date: date || booking.booking_date,
      booking_time: time || booking.booking_time,
      guest_count: partySize || booking.guest_count,
      special_requests: specialRequests || booking.special_requests,
      details: { ...booking.details, dietaryPreferences: dietaryPreferences || booking.details?.dietaryPreferences, seatingPreference: seatingPreference || booking.details?.seatingPreference },
      booking_modified_at: new Date(),
      seating_preference: seatingPreference || booking.seating_preference,
    },
    { transaction }
  );

  return booking;
}

async function cancelBooking({ bookingId, transaction }) {
  const booking = await Booking.findByPk(bookingId, { include: [{ model: Table, as: 'table' }], transaction });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
  if ((bookingDateTime - new Date()) / (1000 * 60 * 60) < mtablesConstants.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS) {
    throw new Error(mtablesConstants.ERROR_TYPES[13]); // CANCELLATION_WINDOW_EXPIRED
  }

  await booking.update({ status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4], booking_modified_at: new Date() }, { transaction });
  await booking.table.update({ status: mtablesConstants.TABLE_STATUSES[0] }, { transaction });

  await BookingPartyMember.update(
    { status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[3], deleted_at: new Date() },
    { where: { booking_id: bookingId }, transaction }
  );

  return { booking };
}

async function processCheckIn({ bookingId, qrCode, method, coordinates, transaction }) {
  const booking = await Booking.findByPk(bookingId, {
    include: [{ model: MerchantBranch, as: 'branch', include: [{ model: Address, as: 'addressRecord' }] }],
    transaction,
  });
  if (!booking || booking.status !== customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[1]) {
    throw new Error(mtablesConstants.ERROR_TYPES[14]); // CHECK_IN_FAILED
  }

  if (!mtablesConstants.CHECK_IN_METHODS.includes(method)) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }
  if (method === mtablesConstants.CHECK_IN_METHODS[0] && qrCode !== booking.check_in_code) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  await booking.update(
    { status: customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[2], arrived_at: new Date() },
    { transaction }
  );

  return { booking, coordinates };
}

async function getBookingHistory({ customerId }) {
  if (!customerId) throw new Error(mtablesConstants.ERROR_TYPES[10]); // INVALID_CUSTOMER_ID

  const bookings = await Booking.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Table, as: 'table' },
      { model: MerchantBranch, as: 'branch', include: [{ model: Address, as: 'addressRecord' }] },
    ],
    order: [['booking_date', 'DESC'], ['booking_time', 'DESC']],
  });

  return bookings;
}

async function submitBookingFeedback({ bookingId, rating, comment, transaction }) {
  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking) throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  if (rating < mtablesConstants.FEEDBACK_SETTINGS.MIN_RATING || rating > mtablesConstants.FEEDBACK_SETTINGS.MAX_RATING) {
    throw new Error(mtablesConstants.ERROR_TYPES[15]); // INVALID_FEEDBACK_RATING
  }

  const review = await Review.create(
    {
      customer_id: booking.customer_id,
      service_type: 'booking',
      service_id: bookingId,
      rating,
      comment,
      is_positive: rating >= mtablesConstants.FEEDBACK_SETTINGS.POSITIVE_RATING_THRESHOLD,
      status: 'pending',
    },
    { transaction }
  );

  return { feedback: review, booking };
}

module.exports = {
  createReservation,
  updateReservation,
  cancelBooking,
  processCheckIn,
  getBookingHistory,
  submitBookingFeedback,
};