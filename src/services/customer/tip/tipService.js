'use strict';

const { sequelize } = require('@models');
const { Tip, Ride, Order, Booking, EventService, InDiningOrder, ParkingBooking, Customer, Driver, Staff, Merchant, Wallet, User } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const driverConstants = require('@constants/driver/driverConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const staffConstants = require('@constants/staff/staffConstants');
const tipConstants = require('@constants/common/tipConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

async function createTip(customerId, recipientId, amount, currency, options = {}, transaction) {
  const { rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId } = options;

  // Validate customer
  const customer = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!customer || !customer.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(customer.status)) {
    throw new AppError('Invalid customer', 400, customerConstants.ERROR_CODES.INVALID_CUSTOMER);
  }

  // Validate recipient
  const recipient = await User.findByPk(recipientId, {
    include: [
      { model: Driver, as: 'driver_profile' },
      { model: Staff, as: 'staff_profile' },
      { model: Merchant, as: 'merchant_profile' },
    ],
    transaction,
  });
  if (!recipient || (!recipient.driver_profile && !recipient.staff_profile && !recipient.merchant_profile)) {
    throw new AppError('Invalid recipient', 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (recipient.driver_profile && !driverConstants.DRIVER_STATUSES.includes(recipient.driver_profile.status)) {
    throw new AppError('Invalid driver status', 400, driverConstants.ERROR_CODES.INVALID_DRIVER);
  }
  if (recipient.staff_profile && !staffConstants.STAFF_STATUSES.includes(recipient.staff_profile.status)) {
    throw new AppError('Invalid staff status', 400, staffConstants.ERROR_CODES.INVALID_STAFF_TYPE);
  }

  // Validate service
  let serviceType, service, serviceModel;
  const services = { rideId, orderId, bookingId, eventServiceId, inDiningOrderId, parkingBookingId };
  const definedService = Object.entries(services).find(([_, id]) => id);
  if (!definedService || Object.values(services).filter(id => id).length > 1) {
    throw new AppError('Tip must be associated with exactly one service', 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  const [serviceKey, serviceId] = definedService;
  serviceType = serviceKey.replace('Id', '');
  const serviceMap = {
    ride: { model: Ride, error: mtxiConstants.ERROR_TYPES.INVALID_RIDE_REQUEST, status: mtxiConstants.RIDE_STATUSES.COMPLETED },
    order: { model: Order, error: munchConstants.ERROR_CODES.ORDER_NOT_FOUND, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.delivered },
    booking: { model: Booking, error: mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS, status: mtablesConstants.BOOKING_STATUSES.CHECKED_IN },
    eventService: { model: EventService, error: meventsConstants.ERROR_TYPES.INVALID_EVENT, status: null },
    inDiningOrder: { model: InDiningOrder, error: mtablesConstants.ERROR_TYPES.INVALID_INPUT, status: mtablesConstants.IN_DINING_STATUSES.CLOSED },
    parkingBooking: { model: ParkingBooking, error: mparkConstants.ERROR_TYPES.PARKING_BOOKING_NOT_FOUND, status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.COMPLETED },
  };

  const { model, error, status } = serviceMap[serviceType];
  serviceModel = model;
  service = await model.findByPk(serviceId, { transaction });

  if (!service || service.customer_id !== customerId) {
    throw new AppError(`Invalid ${serviceType}`, 400, error);
  }

  if (status && service.status !== status) {
    throw new AppError(`Invalid ${serviceType} status`, 400, error);
  }

  // Special validation for eventService
  if (serviceType === 'eventService') {
    const event = await sequelize.models.Event.findByPk(service.event_id, { transaction });
    if (!event || event.status !== meventsConstants.EVENT_STATUSES.COMPLETED) {
      throw new AppError('Invalid event service', 400, meventsConstants.ERROR_TYPES.INVALID_EVENT);
    }
    const validServiceTypes = meventsConstants.EVENT_CONFIG.SERVICE_INTEGRATIONS;
    if (!validServiceTypes.includes(service.service_type)) {
      throw new AppError('Invalid event service type', 400, meventsConstants.ERROR_TYPES.INVALID_SERVICE);
    }
    if (service.service_type === 'MTXI' && !recipient.driver_profile) {
      throw new AppError('Invalid recipient for MTXI service', 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
    }
    if (['MTABLES', 'IN_DINING', 'MPARK'].includes(service.service_type) && !recipient.staff_profile && !recipient.merchant_profile) {
      throw new AppError('Invalid recipient for MTABLES, IN_DINING, or MPARK service', 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
    }
  }

  // Validate recipient association
  if (serviceType === 'ride' && (!service.driver_id || service.driver_id !== recipient.driver_profile?.id)) {
    throw new AppError('Invalid recipient for ride', 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (serviceType === 'order' && service.driver_id && service.driver_id !== recipient.driver_profile?.id) {
    throw new AppError('Invalid recipient for order', 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (['booking', 'inDiningOrder'].includes(serviceType) && service.staff_id && service.staff_id !== recipient.staff_profile?.id) {
    throw new AppError(`Invalid recipient for ${serviceType}`, 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (['booking', 'inDiningOrder', 'parkingBooking'].includes(serviceType) && recipient.merchant_profile && service.merchant_id !== recipient.merchant_profile?.id) {
    throw new AppError(`Invalid merchant recipient for ${serviceType}`, 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (serviceType === 'parkingBooking' && recipient.driver_profile) {
    throw new AppError('Invalid recipient for parking booking', 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }

  // Validate existing tip
  const existingTip = await Tip.findOne({
    where: { [`${serviceType}_id`]: serviceId, customer_id: customerId },
    transaction,
  });
  if (existingTip) {
    throw new AppError('Tip already exists for this service', 400, tipConstants.ERROR_CODES.TIP_ALREADY_EXISTS);
  }

  // Validate amount and currency
  if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
    throw new AppError('Invalid tip amount', 400, tipConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (!munchConstants.MUNCH_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Unsupported currency', 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  // Validate wallets
  const customerWallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!customerWallet || customerWallet.balance < amount || customerWallet.currency !== currency) {
    throw new AppError('Insufficient balance or invalid wallet', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
  }

  const recipientWallet = await Wallet.findOne({ where: { user_id: recipientId }, transaction });
  if (!recipientWallet || recipientWallet.currency !== currency) {
    throw new AppError('Invalid recipient wallet', 400, tipConstants.ERROR_CODES.INVALID_WALLET);
  }

  // Create tip
  const tip = await Tip.create({
    [`${serviceType}_id`]: serviceId,
    customer_id: customerId,
    recipient_id: recipientId,
    wallet_id: customerWallet.id,
    amount,
    currency,
    status: tipConstants.TIP_SETTINGS.TIP_STATUSES.PENDING,
  }, { transaction });

  logger.info('Tip created successfully', { tipId: tip.id, customerId, recipientId, amount });
  return {
    tipId: tip.id,
    amount,
    currency,
    status: tip.status,
    [`${serviceType}Id`]: serviceId,
    walletId: customerWallet.id,
    recipientWalletId: recipientWallet.id,
  };
}

async function updateTip(tipId, customerId, updates, transaction) {
  const { amount, status } = updates;

  // Validate customer
  const customer = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!customer || !customer.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(customer.status)) {
    throw new AppError('Invalid customer', 400, customerConstants.ERROR_CODES.INVALID_CUSTOMER);
  }

  // Find tip
  const tip = await Tip.findByPk(tipId, {
    include: [
      { model: Ride, as: 'ride' },
      { model: Order, as: 'order' },
      { model: Booking, as: 'booking' },
      { model: EventService, as: 'event_service' },
      { model: InDiningOrder, as: 'in_dining_order' },
      { model: ParkingBooking, as: 'parking_booking' },
      { model: Wallet, as: 'wallet' },
    ],
    transaction,
  });
  if (!tip || tip.customer_id !== customerId) {
    throw new AppError('Tip not found or unauthorized', 404, tipConstants.ERROR_CODES.TIP_NOT_FOUND);
  }
  if (tip.status === tipConstants.TIP_SETTINGS.TIP_STATUSES.COMPLETED) {
    throw new AppError('Cannot update completed tip', 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  // Validate updates
  let changes = {};
  if (amount !== undefined) {
    if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
      throw new AppError('Invalid tip amount', 400, tipConstants.ERROR_CODES.INVALID_AMOUNT);
    }
    const customerWallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!customerWallet || customerWallet.balance < amount || customerWallet.currency !== tip.currency) {
      throw new AppError('Insufficient balance or invalid wallet', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);
    }
    changes.amount = amount;
  }
  if (status !== undefined) {
    if (!tipConstants.TIP_SETTINGS.TIP_STATUSES.includes(status)) {
      throw new AppError('Invalid tip status', 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
    }
    changes.status = status;
  }
  if (Object.keys(changes).length === 0) {
    throw new AppError('No valid updates provided', 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  // Update tip
  await tip.update(changes, { transaction });

  logger.info('Tip updated successfully', { tipId, customerId, updates });
  return {
    tipId: tip.id,
    amount: tip.amount,
    currency: tip.currency,
    status: tip.status,
    rideId: tip.ride_id,
    orderId: tip.order_id,
    bookingId: tip.booking_id,
    eventServiceId: tip.event_service_id,
    inDiningOrderId: tip.in_dining_order_id,
    parkingBookingId: tip.parking_booking_id,
  };
}

async function getCustomerTips(customerId) {
  const customer = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }] });
  if (!customer || !customer.customer_profile || !customerConstants.CUSTOMER_STATUSES.includes(customer.status)) {
    throw new AppError('Invalid customer', 400, customerConstants.ERROR_CODES.INVALID_CUSTOMER);
  }

  const tips = await Tip.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Ride, as: 'ride', attributes: ['id', 'status'] },
      { model: Order, as: 'order', attributes: ['id', 'status'] },
      { model: Booking, as: 'booking', attributes: ['id', 'status'] },
      { model: EventService, as: 'event_service', attributes: ['id', 'service_type'] },
      { model: InDiningOrder, as: 'in_dining_order', attributes: ['id', 'status'] },
      { model: ParkingBooking, as: 'parking_booking', attributes: ['id', 'status'] },
      {
        model: User, as: 'recipient', attributes: ['id', 'first_name', 'last_name'],
        include: [
          { model: Driver, as: 'driver_profile' },
          { model: Staff, as: 'staff_profile' },
          { model: Merchant, as: 'merchant_profile' },
        ],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  logger.info('Customer tips retrieved', { customerId, count: tips.length });
  return tips.map(tip => ({
    tipId: tip.id,
    amount: tip.amount,
    currency: tip.currency,
    status: tip.status,
    rideId: tip.ride_id,
    orderId: tip.order_id,
    bookingId: tip.booking_id,
    eventServiceId: tip.event_service_id,
    inDiningOrderId: tip.in_dining_order_id,
    parkingBookingId: tip.parking_booking_id,
    recipientName: tip.recipient?.getFullName(),
    createdAt: tip.created_at,
  }));
}

module.exports = { createTip, updateTip, getCustomerTips };