'use strict';

const { sequelize } = require('@models');
const { Tip, Ride, Order, Booking, EventService, InDiningOrder, Customer, Driver, Staff, Wallet, User } = require('@models');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const tipConstants = require('@constants/common/tipConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

async function createTip(customerId, recipientId, amount, currency, options = {}, transaction) {
  const { rideId, orderId, bookingId, eventServiceId, inDiningOrderId } = options;

  // Validate customer
  const customer = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
  if (!customer || !customer.customer_profile) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_customer'), 400, tipConstants.ERROR_CODES.INVALID_CUSTOMER);
  }

  // Validate recipient
  const recipient = await User.findByPk(recipientId, {
    include: [{ model: Driver, as: 'driver_profile' }, { model: Staff, as: 'staff_profile' }],
    transaction,
  });
  if (!recipient || (!recipient.driver_profile && !recipient.staff_profile)) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_recipient'), 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }

  // Validate service
  let serviceType, service, serviceModel;
  const services = { rideId, orderId, bookingId, eventServiceId, inDiningOrderId };
  const definedService = Object.entries(services).find(([_, id]) => id);
  if (!definedService || Object.values(services).filter(id => id).length > 1) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_action_failed'), 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  const [serviceKey, serviceId] = definedService;
  serviceType = serviceKey.replace('Id', '');
  const serviceMap = {
    ride: { model: Ride, error: tipConstants.ERROR_CODES.INVALID_RIDE, status: 'completed' },
    order: { model: Order, error: tipConstants.ERROR_CODES.INVALID_ORDER, status: 'delivered' },
    booking: { model: Booking, error: tipConstants.ERROR_CODES.INVALID_BOOKING, status: 'seated' },
    eventService: { model: EventService, error: tipConstants.ERROR_CODES.INVALID_EVENT_SERVICE, status: null },
    inDiningOrder: { model: InDiningOrder, error: tipConstants.ERROR_CODES.INVALID_IN_DINING_ORDER, status: 'closed' },
  };

  const { model, error, status } = serviceMap[serviceType];
  serviceModel = model;
  service = await model.findByPk(serviceId, { transaction });

  if (!service || service.customer_id !== customerId) {
    throw new AppError(formatMessage('customer', 'tip', 'en', `error.invalid_${serviceType}`), 400, error);
  }

  if (status && service.status !== status) {
    throw new AppError(formatMessage('customer', 'tip', 'en', `error.invalid_${serviceType}`), 400, error);
  }

  // Special validation for eventService
  if (serviceType === 'eventService') {
    const event = await sequelize.models.Event.findByPk(service.event_id, { transaction });
    if (!event || event.status !== 'completed') {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_event_service'), 400, error);
    }
    const validServiceTypes = ['mtables', 'munch', 'mtxi', 'in_dining'];
    if (!validServiceTypes.includes(service.service_type)) {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_event_service'), 400, error);
    }
    if (service.service_type === 'mtxi' && !recipient.driver_profile) {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_recipient'), 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
    }
    if (['mtables', 'in_dining'].includes(service.service_type) && !recipient.staff_profile) {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_recipient'), 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
    }
  }

  // Validate recipient association
  if (serviceType === 'ride' && (!service.driver_id || service.driver_id !== recipient.driver_profile?.id)) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_recipient'), 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (serviceType === 'order' && service.driver_id && service.driver_id !== recipient.driver_profile?.id) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_recipient'), 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }
  if (['booking', 'inDiningOrder'].includes(serviceType) && service.staff_id && service.staff_id !== recipient.staff_profile?.id) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_recipient'), 400, tipConstants.ERROR_CODES.INVALID_RECIPIENT);
  }

  // Validate existing tip
  const existingTip = await Tip.findOne({
    where: { [`${serviceType}_id`]: serviceId, customer_id: customerId },
    transaction,
  });
  if (existingTip) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_already_exists'), 400, tipConstants.ERROR_CODES.TIP_ALREADY_EXISTS);
  }

  // Validate amount and currency
  if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_amount'), 400, tipConstants.ERROR_CODES.INVALID_AMOUNT);
  }
  if (!tipConstants.TIP_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_action_failed'), 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  // Validate wallets
  const customerWallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
  if (!customerWallet || customerWallet.balance < amount || customerWallet.currency !== currency) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.insufficient_balance'), 400, tipConstants.ERROR_CODES.INSUFFICIENT_BALANCE);
  }

  const recipientWallet = await Wallet.findOne({ where: { user_id: recipientId }, transaction });
  if (!recipientWallet || recipientWallet.currency !== currency) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_wallet'), 400, tipConstants.ERROR_CODES.INVALID_WALLET);
  }

  // Create tip
  const tip = await Tip.create({
    [`${serviceType}_id`]: serviceId,
    customer_id: customerId,
    recipient_id: recipientId,
    wallet_id: customerWallet.id,
    amount,
    currency,
    status: 'pending',
  }, { transaction });

  // Award points dynamically
  await pointService.awardPoints({
    userId: customerId,
    action: 'CREATE_TIP',
    points: Math.floor(amount * 10), // 10 points per currency unit
    referenceId: tip.id,
    referenceType: 'Tip',
  }, transaction);

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
  if (!customer || !customer.customer_profile) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_customer'), 400, tipConstants.ERROR_CODES.INVALID_CUSTOMER);
  }

  // Find tip
  const tip = await Tip.findByPk(tipId, {
    include: [
      { model: Ride, as: 'ride' },
      { model: Order, as: 'order' },
      { model: Booking, as: 'booking' },
      { model: EventService, as: 'event_service' },
      { model: InDiningOrder, as: 'in_dining_order' },
      { model: Wallet, as: 'wallet' },
    ],
    transaction,
  });
  if (!tip || tip.customer_id !== customerId) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_not_found'), 404, tipConstants.ERROR_CODES.TIP_NOT_FOUND);
  }
  if (tip.status === 'completed') {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_action_failed'), 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  // Validate updates
  let changes = {};
  if (amount !== undefined) {
    if (amount < tipConstants.TIP_SETTINGS.MIN_AMOUNT || amount > tipConstants.TIP_SETTINGS.MAX_AMOUNT) {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_amount'), 400, tipConstants.ERROR_CODES.INVALID_AMOUNT);
    }
    const customerWallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!customerWallet || customerWallet.balance < amount || customerWallet.currency !== tip.currency) {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.insufficient_balance'), 400, tipConstants.ERROR_CODES.INSUFFICIENT_BALANCE);
    }
    changes.amount = amount;
  }
  if (status !== undefined) {
    if (!tipConstants.TIP_SETTINGS.TIP_STATUSES.includes(status)) {
      throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_action_failed'), 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
    }
    changes.status = status;
  }
  if (Object.keys(changes).length === 0) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.tip_action_failed'), 400, tipConstants.ERROR_CODES.TIP_ACTION_FAILED);
  }

  // Update tip
  await tip.update(changes, { transaction });

  // Award points for status change to completed
  if (changes.status === 'completed') {
    await pointService.awardPoints({
      userId: customerId,
      action: 'COMPLETE_TIP',
      points: 50, // Fixed points for completing tip
      referenceId: tip.id,
      referenceType: 'Tip',
    }, transaction);
  }

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
  };
}

async function getCustomerTips(customerId) {
  const customer = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }] });
  if (!customer || !customer.customer_profile) {
    throw new AppError(formatMessage('customer', 'tip', 'en', 'error.invalid_customer'), 400, tipConstants.ERROR_CODES.INVALID_CUSTOMER);
  }

  const tips = await Tip.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Ride, as: 'ride', attributes: ['id', 'status'] },
      { model: Order, as: 'order', attributes: ['id', 'status'] },
      { model: Booking, as: 'booking', attributes: ['id', 'status'] },
      { model: EventService, as: 'event_service', attributes: ['id', 'service_type'] },
      { model: InDiningOrder, as: 'in_dining_order', attributes: ['id', 'status'] },
      { model: User, as: 'recipient', attributes: ['id', 'first_name', 'last_name'], include: [{ model: Driver, as: 'driver_profile' }, { model: Staff, as: 'staff_profile' }] },
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
    recipientName: tip.recipient?.getFullName(),
    createdAt: tip.created_at,
  }));
}

module.exports = { createTip, updateTip, getCustomerTips };