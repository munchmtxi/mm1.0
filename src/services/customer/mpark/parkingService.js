'use strict';

const { Op } = require('sequelize');
const { ParkingSpace, Address, Customer, Wallet, WalletTransaction } = require('@models');
const mparkConstants = require('@constants/common/mparkConstants');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');

async function listNearbyParking(customerId, location) {
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const { latitude, longitude } = location;
  const spaces = await ParkingSpace.findAll({
    where: { status: mparkConstants.SPACE_CONFIG.SPACE_STATUSES[0] }, // AVAILABLE
    include: [{
      model: Merchant,
      as: 'merchant',
      include: [{
        model: Address,
        as: 'address',
        where: {
          latitude: { [Op.between]: [latitude - 0.05, latitude + 0.05] },
          longitude: { [Op.between]: [longitude - 0.05, longitude + 0.05] },
        },
      }],
    }],
  });

  const prioritized = spaces.filter(space =>
    customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.some(plan =>
      plan.benefits.includes('priority_parking') && customer.preferences?.subscription === plan.name
    )
  );

  logger.info('Nearby parking listed', { customerId, location });
  return prioritized.length ? prioritized : spaces;
}

async function getParkingLotDetails(lotId) {
  const spaces = await ParkingSpace.findAll({
    where: { merchant_id: lotId },
    include: [{ model: Merchant, as: 'merchant', include: [{ model: Address, as: 'address' }] }],
  });

  if (!spaces.length) {
    throw new Error(mparkConstants.ERROR_TYPES[6]); // INVALID_LOCATION
  }

  return spaces;
}

async function reserveParking(customerId, lotId, spaceId, duration) {
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const space = await ParkingSpace.findByPk(spaceId);
  if (!space || space.merchant_id !== lotId || space.status !== mparkConstants.SPACE_CONFIG.SPACE_STATUSES[0]) {
    throw new Error(mparkConstants.ERROR_TYPES[0]); // INVALID_PARKING_SPOT
  }

  const booking = await ParkingBooking.create({
    customer_id: customerId,
    space_id: spaceId,
    merchant_id: lotId,
    booking_type: duration <= 24 * 60 ? 'HOURLY' : 'DAILY',
    status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[0], // PENDING
    start_time: new Date(),
    end_time: new Date(new Date().getTime() + duration * 60000),
    check_in_method: mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS[0], // QR_CODE
  });

  space.status = mparkConstants.SPACE_CONFIG.SPACE_STATUSES[2]; // RESERVED
  await space.save();

  logger.info('Parking reserved', { customerId, spaceId, lotId });
  return { message: mparkConstants.SUCCESS_MESSAGES[0], booking }; // PARKING_BOOKED
}

async function checkParkingAvailability(lotId, date) {
  const spaces = await ParkingSpace.findAll({
    where: { merchant_id: lotId, status: mparkConstants.SPACE_CONFIG.SPACE_STATUSES[0] }, // AVAILABLE
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

async function manageParkingSubscription(customerId, action, plan) {
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const subscription = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(p => p.name === plan);
  if (!subscription) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  let status;
  switch (action) {
    case 'create':
      status = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0]; // active
      customer.preferences = { ...customer.preferences, subscription: plan };
      break;
    case 'renew':
      status = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0]; // active
      break;
    case 'cancel':
      status = customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[2]; // cancelled
      customer.preferences = { ...customer.preferences, subscription: null };
      break;
    default:
      throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  await customer.save();
  logger.info('Parking subscription managed', { customerId, action, plan, status });
  return { message: customerConstants.SUCCESS_MESSAGES[0], subscription: { plan, status } }; // customer_registered
}

async function getSubscriptionStatus(customerId) {
  const customer = await Customer.findByPk(customerId);
  if (!customer || customer.status !== customerConstants.CUSTOMER_STATUSES[0]) {
    throw new Error(customerConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const subscription = customer.preferences?.subscription
    ? customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_PLANS.find(p => p.name === customer.preferences.subscription)
    : null;

  return { subscription: subscription || null, status: subscription ? customerConstants.SUBSCRIPTION_CONSTANTS.SUBSCRIPTION_STATUSES[0] : null };
}

module.exports = {
  listNearbyParking,
  getParkingLotDetails,
  reserveParking,
  checkParkingAvailability,
  manageParkingSubscription,
  getSubscriptionStatus,
};