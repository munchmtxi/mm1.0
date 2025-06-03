'use strict';

const { Tip, Customer, Ride, Order, Driver } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const tipConstants = require('@constants/customer/tipConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const driverConstants = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('sequelize');

async function sendTip(customerId, rideId, orderId, amount, splitWithFriends, transaction) {
  if ((rideId && orderId) || (!rideId && !orderId)) {
    throw new AppError('Must provide either rideId or orderId', 400, tipConstants.ERROR_CODES[0]);
  }

  let serviceType, entity, customer, recipient;
  if (rideId) {
    serviceType = 'ride';
    entity = await Ride.findByPk(rideId, { include: [{ model: Customer }, { model: Driver, as: 'recipient' }], transaction });
    if (!entity) throw new AppError('Ride not found', 404, tipConstants.ERROR_CODES[2]);
    if (entity.status !== driverConstants.MTXI_CONSTANTS.RIDE_STATUSES[3]) {
      throw new AppError('Ride not completed', 400, tipConstants.ERROR_CODES[2]);
    }
    customer = entity.Customer;
    recipient = entity.recipient;
  } else {
    serviceType = 'order';
    entity = await Order.findByPk(orderId, { include: [{ model: Customer }, { model: Driver, as: 'recipient' }], transaction });
    if (!entity) throw new AppError('Order not found', 404, tipConstants.ERROR_CODES[3]);
    if (entity.status !== driverConstants.MUNUCH_DELIVERY_CONSTANTS.DELIVERY_STATUSES[4]) {
      throw new AppError('Order not delivered', 400, tipConstants.ERROR_CODES[3]);
    }
    customer = entity.Customer;
    recipient = entity.recipient;
  }

  if (customer.id !== customerId) {
    throw new AppError('Unauthorized customer', 403, tipConstants.ERROR_CODES[0]);
  }

  const TIP_LIMITS = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'TIP');
  if (amount < TIP_LIMITS.min || amount > TIP_LIMITS.max) {
    throw new AppError('Invalid tip amount', 400, tipConstants.ERROR_CODES[9]);
  }

  let finalAmount = amount;
  if (splitWithFriends && splitWithFriends.length > 0) {
    const maxFriends = serviceType === 'ride' ? driverConstants.MTXI_CONSTANTS.SHARED_RIDE_SETTINGS.MAX_PASSENGERS_PER_SHARED_RIDE : 3;
    if (splitWithFriends.length > maxFriends) {
      throw new AppError('Too many friends for split tip', 400, tipConstants.ERROR_CODES[0]);
    }
    finalAmount = amount / (splitWithFriends.length + 1);
  }

  const tip = await Tip.create(
    {
      ride_id: rideId || null,
      order_id: orderId || null,
      customer_id: customerId,
      recipient_id: recipient.id,
      amount: finalAmount * (splitWithFriends ? splitWithFriends.length + 1 : 1),
      currency: driverConstants.DRIVER_SETTINGS.DEFAULT_CURRENCY,
      status: tipConstants.TIP_SETTINGS.TIP_STATUSES[0],
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Tip sent', { tipId: tip.id, rideId, orderId, amount: tip.amount, serviceType });
  return tip;
}

async function cancelTip(customerId, tipId, transaction) {
  const tip = await Tip.findOne({
    where: { id: tipId, customer_id: customerId, status: tipConstants.TIP_SETTINGS.TIP_STATUSES[0] },
    transaction,
  });
  if (!tip) throw new AppError('Tip not found or not cancellable', 404, tipConstants.ERROR_CODES[11]);

  await tip.update(
    {
      status: tipConstants.TIP_SETTINGS.TIP_STATUSES[2],
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Tip cancelled', { tipId, customerId });
  return tip;
}

async function updateTipStatus(tipId, newStatus, transaction) {
  if (!tipConstants.TIP_SETTINGS.TIP_STATUSES.includes(newStatus)) {
    throw new AppError('Invalid tip status', 400, tipConstants.ERROR_CODES[12]);
  }

  const tip = await Tip.findByPk(tipId, { transaction });
  if (!tip) throw new AppError('Tip not found', 404, tipConstants.ERROR_CODES[11]);

  if (tip.status === newStatus) {
    throw new AppError('Tip already in this status', 400, tipConstants.ERROR_CODES[12]);
  }

  await tip.update(
    {
      status: newStatus,
      updated_at: new Date(),
    },
    { transaction }
  );

  logger.info('Tip status updated', { tipId, newStatus });
  return tip;
}

async function getTipHistory(customerId, transaction) {
  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) throw new AppError('Customer not found', 404, tipConstants.ERROR_CODES[0]);

  const tips = await Tip.findAll({
    where: { customer_id: customerId },
    include: [
      { model: Ride, attributes: ['id', 'pickup_location', 'dropoff_location'] },
      { model: Order, attributes: ['id', 'delivery_address'] },
    ],
    order: [['created_at', 'DESC']],
    transaction,
  });

  logger.info('Tip history retrieved', { customerId, count: tips.length });
  return tips;
}

module.exports = {
  sendTip,
  cancelTip,
  updateTipStatus,
  getTipHistory,
};