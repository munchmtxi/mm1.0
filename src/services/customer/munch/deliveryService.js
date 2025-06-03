'use strict';

const { Op } = require('sequelize');
const { Order, Customer, Driver, User, Wallet } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const locationService = require('@services/common/locationService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function trackDeliveryStatus(orderId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }
  if (!order.driver_id) {
    throw new AppError(
      formatMessage('customer', 'munch', order?.customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.no_driver_assigned'),
      400,
      munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED
    );
  }

  const driverLocation = order.driver.current_location
    ? await locationService.resolveLocation(order.driver.current_location)
    : null;

  logger.info('Delivery status tracked', { orderId, status: order.status });
  return {
    orderId: order.id,
    status: order.status,
    estimatedDeliveryTime: order.estimated_delivery_time,
    driver: {
      name: order.driver.name,
      phone: order.driver.phone_number,
      location: driverLocation ? driverLocation.coordinates : null,
    },
    deliveryLocation: order.delivery_location,
    lastUpdated: order.updated_at,
  };
}

async function cancelDelivery(orderId, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }
  if (order.status === munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6]) {
    throw new AppError(
      formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.order_already_cancelled'),
      400,
      munchConstants.ERROR_CODES.ORDER_ALREADY_CANCELLED
    );
  }
  if ([munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[5], munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4]].includes(order.status)) {
    throw new AppError(
      formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.cannot_cancel_order'),
      400,
      munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER
    );
  }

  await order.update({ status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[6] }, { transaction });

  if (order.payment_status === paymentConstants.PAYMENT_STATUSES[1]) {
    const wallet = await Wallet.findOne({ where: { user_id: order.customer.user_id }, transaction });
    if (!wallet) {
      throw new AppError(
        formatMessage('customer', 'munch', order.customer.user.preferred_language, 'error.wallet_not_found'),
        404,
        munchConstants.ERROR_CODES.WALLET_NOT_FOUND
      );
    }
    return { order, wallet, refundAmount: order.total_amount };
  }

  return { order, refundProcessed: false };
}

async function communicateWithDriver(orderId, message, transaction) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
      { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
    ],
    transaction,
  });

  if (!order) {
    throw new AppError(
      formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'),
      404,
      munchConstants.ERROR_CODES.ORDER_NOT_FOUND
    );
  }
  if (!order.driver_id) {
    throw new AppError(
      formatMessage('customer', 'munch', order?.customer?.user?.preferred_language || munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.no_driver_assigned'),
      400,
      munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED
    );
  }

  const sanitizedMessage = message.trim().substring(0, 500);

  logger.info('Message sent to driver', { orderId, driverId: order.driver_id });
  return { orderId, message: sanitizedMessage, sentAt: new Date() };
}

module.exports = { trackDeliveryStatus, cancelDelivery, communicateWithDriver };