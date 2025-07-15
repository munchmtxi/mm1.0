'use strict';

const { Op } = require('sequelize');
const { ParkingBooking, Customer, Payment, Wallet, WalletTransaction } = require('@models');
const mparkConstants = require('@constants/common/mparkConstants');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');

async function createBooking(customerId, parkingDetails) {
  const { spaceId, bookingType, startTime, endTime, checkInMethod, vehicleDetails } = parkingDetails;
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const activeBookings = await ParkingBooking.count({
    where: { customer_id: customerId, status: { [Op.in]: ['PENDING', 'CONFIRMED', 'OCCUPIED'] } },
  });
  if (activeBookings >= mparkConstants.PARKING_CONFIG.MAX_ACTIVE_PARKING_BOOKINGS_PER_CUSTOMER) {
    throw new Error(mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
  }

  if (!mparkConstants.BOOKING_CONFIG.BOOKING_TYPES.includes(bookingType) ||
      !mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS.includes(checkInMethod)) {
    throw new Error(mparkConstants.ERROR_TYPES[2]); // INVALID_BOOKING_DURATION
  }

  const durationMinutes = (new Date(endTime) - new Date(startTime)) / 60000;
  if (durationMinutes < mparkConstants.BOOKING_CONFIG.BOOKING_POLICIES.MIN_BOOKING_MINUTES ||
      durationMinutes > mparkConstants.BOOKING_CONFIG.BOOKING_LENGTHS.MAXIMUM[bookingType] * 24 * 60) {
    throw new Error(mparkConstants.ERROR_TYPES[2]); // INVALID_BOOKING_DURATION
  }

  const booking = await ParkingBooking.create({
    customer_id: customerId,
    space_id: spaceId,
    merchant_id: parkingDetails.merchantId,
    booking_type: bookingType,
    status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[0], // PENDING
    start_time: startTime,
    end_time: endTime,
    check_in_method: checkInMethod,
    vehicle_details: vehicleDetails,
  });

  logger.info('Parking booking created', { bookingId: booking.id, customerId });
  return { message: mparkConstants.SUCCESS_MESSAGES[0], booking }; // PARKING_BOOKED
}

async function cancelBooking(bookingId) {
  const booking = await ParkingBooking.findByPk(bookingId);
  if (!booking) {
    throw new Error(mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
  }

  const now = new Date();
  const timeToStart = (new Date(booking.start_time) - now) / 3600000;
  if (timeToStart < mparkConstants.BOOKING_CONFIG.BOOKING_POLICIES.CANCELLATION_WINDOW_HOURS) {
    throw new Error(mparkConstants.ERROR_TYPES[4]); // CANCELLATION_NOT_ALLOWED
  }

  booking.status = mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[4]; // CANCELLED
  await booking.save();

  logger.info('Parking booking cancelled', { bookingId });
  return { message: mparkConstants.SUCCESS_MESSAGES[1] }; // PARKING_CANCELLED
}

async function extendBooking(bookingId, duration) {
  const booking = await ParkingBooking.findByPk(bookingId);
  if (!booking) {
    throw new Error(mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
  }

  if (booking.status !== mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[2]) { // OCCUPIED
    throw new Error(mparkConstants.ERROR_TYPES[5]); // EXTENSION_NOT_ALLOWED
  }

  const newDuration = (new Date(booking.end_time) - new Date(booking.start_time)) / 60000 + duration;
  if (duration > mparkConstants.BOOKING_CONFIG.BOOKING_POLICIES.EXTENSION_LIMIT_MINUTES ||
      newDuration > mparkConstants.BOOKING_CONFIG.BOOKING_LENGTHS.MAXIMUM[booking.booking_type] * 24 * 60) {
    throw new Error(mparkConstants.ERROR_TYPES[2]); // INVALID_BOOKING_DURATION
  }

  booking.end_time = new Date(new Date(booking.end_time).getTime() + duration * 60000);
  await booking.save();

  logger.info('Parking booking extended', { bookingId, duration });
  return { message: mparkConstants.SUCCESS_MESSAGES[2] }; // PARKING_TIME_EXTENDED
}

async function getCustomerBookings(customerId) {
  const bookings = await ParkingBooking.findAll({
    where: { customer_id: customerId },
    include: [{ model: Customer, as: 'customer' }, { model: ParkingSpace, as: 'space' }],
  });
  return bookings;
}

async function checkInBooking(bookingId, method) {
  const booking = await ParkingBooking.findByPk(bookingId);
  if (!booking) {
    throw new Error(mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
  }

  if (!mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS.includes(method)) {
    throw new Error(mparkConstants.ERROR_TYPES[2]); // INVALID_BOOKING_DURATION
  }

  if (booking.status !== mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[1]) { // CONFIRMED
    throw new Error(mparkConstants.ERROR_TYPES[5]); // EXTENSION_NOT_ALLOWED
  }

  booking.status = mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[2]; // OCCUPIED
  booking.check_in_method = method;
  await booking.save();

  logger.info('Parking booking checked in', { bookingId, method });
  return { message: mparkConstants.SUCCESS_MESSAGES[3] }; // PARKING_CHECKED_IN
}

async function searchAvailableParking(city, type, date) {
  if (!Object.values(mparkConstants.PARKING_CONFIG.SUPPORTED_CITIES).flat().includes(city) ||
      !mparkConstants.SPACE_CONFIG.SPACE_TYPES.includes(type)) {
    throw new Error(mparkConstants.ERROR_TYPES[6]); // INVALID_LOCATION
  }

  const spaces = await ParkingSpace.findAll({
    where: {
      space_type: type,
      status: mparkConstants.SPACE_CONFIG.SPACE_STATUSES[0], // AVAILABLE
    },
    include: [{ model: Merchant, as: 'merchant', include: [{ model: Address, as: 'address', where: { components: { city } } }] }],
  });

  const available = await Promise.all(spaces.map(async space => {
    const bookings = await ParkingBooking.findAll({
      where: {
        space_id: space.id,
        [Op.or]: [
          { start_time: { [Op.lte]: date }, end_time: { [Op.gte]: date } },
        ],
        status: { [Op.in]: ['PENDING', 'CONFIRMED', 'OCCUPIED'] },
      },
    });
    return bookings.length === 0 ? space : null;
  }));

  return available.filter(space => space !== null);
}

async function createSubscriptionBooking(customerId, subscriptionId, parkingDetails) {
  const { spaceId, bookingType, startTime, endTime, checkInMethod, vehicleDetails } = parkingDetails;
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const subscription = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(plan => plan.name === subscriptionId);
  if (!subscription || !subscription.benefits.includes('priority_parking')) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const booking = await ParkingBooking.create({
    customer_id: customerId,
    space_id: spaceId,
    merchant_id: parkingDetails.merchantId,
    booking_type: bookingType,
    status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[0], // PENDING
    start_time: startTime,
    end_time: endTime,
    check_in_method: checkInMethod,
    vehicle_details: vehicleDetails,
  });

  logger.info('Subscription parking booking created', { bookingId: booking.id, customerId, subscriptionId });
  return { message: mparkConstants.SUCCESS_MESSAGES[0], booking }; // PARKING_BOOKED
}

module.exports = {
  createBooking,
  cancelBooking,
  extendBooking,
  getCustomerBookings,
  checkInBooking,
  searchAvailableParking,
  createSubscriptionBooking,
};