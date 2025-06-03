'use strict';

const { Op } = require('sequelize');
const { sequelize, User, Customer, Wallet, Order, InDiningOrder, Booking, Ride, Event, EventService, Payment, WalletTransaction } = require('@models');
const walletService = require('@services/common/walletService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const mtablesConstants = require('@constants/customer/mtables/mtablesConstants');
const rideConstants = require('@constants/customer/ride/rideConstants');
const meventsConstants = require('@constants/customer/mevents/meventsConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function splitPayment(serviceId, serviceType, payments, transaction) {
  let service, totalAmount = 0, merchantId, paymentField;
  switch (serviceType) {
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'), 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
      totalAmount = service.total_amount;
      merchantId = service.merchant_id;
      paymentField = 'order_id';
      break;
    case 'in_dining_order':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'), 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
      totalAmount = service.total_amount;
      merchantId = service.branch_id ? (await service.getBranch({ transaction }))?.merchant_id : null;
      paymentField = 'in_dining_order_id';
      break;
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('customer', 'mtables', mtablesConstants.MTABLES_SETTINGS.DEFAULT_LANGUAGE, 'error.booking_not_found'), 404, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      totalAmount = service.details?.total_amount || 0;
      merchantId = service.merchant_id;
      paymentField = 'order_id';
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { include: [{ model: Payment, as: 'payment' }], transaction });
      if (!service) throw new AppError(formatMessage('ride', 'ride', rideConstants.DEFAULT.DEFAULT_LANGUAGE, 'error.ride_not_found'), 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
      totalAmount = service.payment?.amount || 0;
      merchantId = null;
      paymentField = null;
    case 'event':
      service = await Event.findByPk(serviceId, { include: [{ model: EventService, as: 'services', include: [Order, InDiningOrder, Booking, Ride] }], transaction });
      if (!service) throw new AppError(formatMessage('event', 'mevents', meventsConstants.MEVENTS_SETTINGS.DEFAULT_LANGUAGE, 'error.event_not_found'), 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
      if (service.payment_type !== meventsConstants.PAYMENT_TYPES.SPLIT) {
        throw new AppError(formatMessage('event', 'mevents', meventsConstants.MEVENTS_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_payment_type'), 400, meventsConstants.ERROR_CODES.INVALID_PAYMENT_TYPE);
      }
      for (const eventService of service.services) {
        switch (eventService.service_type) {
          case 'order':
            const order = await Order.findByPk(eventService.service_id, { transaction });
            totalAmount += order?.total_amount || 0;
            merchantId = order?.merchant_id;
            break;
          case 'in_dining_order':
            const inDiningOrder = await InDiningOrder.findByPk(eventService.service_id, { transaction });
            totalAmount += inDiningOrder?.total_amount || 0;
            merchantId = inDiningOrder?.branch_id ? (await inDiningOrder.getBranch({ transaction }))?.merchant_id : null;
            break;
          case 'booking':
            const booking = await Booking.findByPk(eventService.service_id, { transaction });
            totalAmount += booking?.details?.total_amount || 0;
            merchantId = booking?.merchant_id;
            break;
          case 'ride':
            const ride = await Ride.findByPk(eventService.service_id, { include: [{ model: Payment, as: 'payment' }], transaction });
            totalAmount += ride?.payment?.amount || 0;
            break;
        }
      }
      paymentField = null;
      break;
    default:
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service_type'), 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPayment !== totalAmount && totalAmount > 0) {
    throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.total_mismatch'), 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const splitPayments = [];
  const processedCustomerIds = new Set();

  for (const payment of payments) {
    const { customerId, amount, paymentMethod } = payment;

    if (processedCustomerIds.has(customerId)) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.duplicate_customer'), 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
    }
    processedCustomerIds.add(customerId);

    const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
    if (!user || !user.customer_profile) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'), 400, meventsConstants.ERROR_CODES.INVALID_CUSTOMER);
    }

    const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
    }
    if (!wallet.payment_methods?.includes(paymentMethod) || !paymentConstants.PAYMENT_METHODS.includes(paymentMethod)) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_payment_method'), 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
    }
    if (wallet.balance < amount) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.insufficient_funds'), 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
    }

    const transactionRecord = await walletService.processTransaction({
      walletId: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES[1],
      amount,
      currency: wallet.currency,
      paymentMethod,
      description: `Split payment for ${serviceType} #${serviceId}`,
    }, transaction);

    await WalletTransaction.update(
      { status: paymentConstants.TRANSACTION_STATUSES[1] },
      { where: { id: transactionRecord.id }, transaction }
    );

    const paymentData = {
      customer_id: customerId,
      merchant_id: merchantId || null,
      amount,
      payment_method: paymentMethod,
      status: paymentConstants.TRANSACTION_STATUSES[1],
      transaction_id: transactionRecord.id.toString(),
      currency: wallet.currency,
      created_at: new Date(),
      updated_at: new Date(),
    };
    if (paymentField) paymentData[paymentField] = serviceId;
    const paymentRecord = await Payment.create(paymentData, { transaction });

    if (serviceType === 'ride') {
      await service.update({ paymentId: paymentRecord.id }, { transaction });
    } else if (serviceType === 'event') {
      const eventServices = service.services;
      let remainingAmount = amount;
      for (let i = 0; i < eventServices.length; i++) {
        const eventService = eventServices[i];
        const serviceAmount = i === eventServices.length - 1 ? remainingAmount : (amount * (await getServiceAmount(eventService, transaction)) / totalAmount);
        remainingAmount -= serviceAmount;
        await EventService.update(
          { payment_id: paymentRecord.id },
          { where: { id: eventService.id }, transaction }
        );
      }
    }

    splitPayments.push({
      paymentId: paymentRecord.id,
      customerId,
      amount,
      transactionId: transactionRecord.id,
    });
  }

  const statusUpdate = {};
  switch (serviceType) {
    case 'order':
    case 'in_dining_order':
      statusUpdate.payment_status = 'paid';
      break;
    case 'booking':
      statusUpdate.status = mtablesConstants.BOOKING_STATUSES[1];
      break;
    case 'ride':
      statusUpdate.status = rideConstants.RIDE_STATUSES[3];
      break;
    case 'event':
      statusUpdate.status = meventsConstants.EVENT_STATUSES[1];
      break;
  }
  await service.update(statusUpdate, { transaction });

  logger.info('Split payment processed', { serviceId, serviceType, splitCount: payments.length });
  return { serviceId, serviceType, splitPayments };
}

async function manageSplitPaymentRefunds(serviceId, serviceType, refunds, transaction) {
  let service, paymentQuery;
  switch (serviceType) {
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'), 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
      paymentQuery = { order_id: serviceId };
      break;
    case 'in_dining_order':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('customer', 'munch', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.order_not_found'), 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
      paymentQuery = { in_dining_order_id: serviceId };
      break;
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('customer', 'mtables', mtablesConstants.MTABLES_SETTINGS.DEFAULT_LANGUAGE, 'error.booking_not_found'), 404, mtablesConstants.ERROR_CODES.BOOKING_NOT_FOUND);
      paymentQuery = { order_id: serviceId };
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service) throw new AppError(formatMessage('ride', 'ride', rideConstants.DEFAULT.DEFAULT_LANGUAGE, 'error.ride_not_found'), 404, rideConstants.ERROR_CODES.RIDE_NOT_FOUND);
      paymentQuery = { id: service.paymentId };
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { include: [{ model: EventService, as: 'services' }], transaction });
      if (!service) throw new AppError(formatMessage('event', 'mevents', meventsConstants.MEVENTS_SETTINGS.DEFAULT_LANGUAGE, 'error.event_not_found'), 404, meventsConstants.ERROR_CODES.EVENT_NOT_FOUND);
      paymentQuery = { id: { [Op.in]: service.services.map(s => s.payment_id).filter(id => id) } };
      break;
    default:
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_service_type'), 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
  }

  const payments = await Payment.findAll({ where: paymentQuery, transaction });
  if (!payments.length) {
    throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.no_payments_found'), 404, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
  }

  const refundRecords = [];
  const processedCustomerIds = new Set();

  for (const refund of refunds) {
    const { customerId, amount } = refund;

    if (processedCustomerIds.has(customerId)) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.duplicate_customer'), 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
    }
    processedCustomerIds.add(customerId);

    const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
    if (!user || !user.customer_profile) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_customer'), 400, meventsConstants.ERROR_CODES.INVALID_CUSTOMER);
    }

    const payment = payments.find(p => p.customer_id === customerId);
    if (!payment) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.payment_not_found'), 404, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
    }
    if (amount > payment.amount) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.refund_exceeds_payment'), 400, paymentConstants.ERROR_CODES.TRANSACTION_FAILED);
    }

    const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet) {
      throw new AppError(formatMessage('customer', 'payments', munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE, 'error.wallet_not_found'), 404, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
    }

    const transactionRecord = await walletService.processTransaction({
      walletId: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES[2],
      amount,
      currency: wallet.currency,
      paymentMethod: payment.payment_method,
      description: `Refund for ${serviceType} #${serviceId}`,
    }, transaction);

    await WalletTransaction.update(
      { status: paymentConstants.TRANSACTION_STATUSES[1] },
      { where: { id: transactionRecord.id }, transaction }
    );

    const newAmount = payment.amount - amount;
    await payment.update({
      amount: newAmount,
      status: newAmount === 0 ? paymentConstants.TRANSACTION_STATUSES[3] : paymentConstants.TRANSACTION_STATUSES[1],
      refund_status: 'processed',
      refund_details: { reason: 'Split payment refund', amount, timestamp: new Date() },
      updated_at: new Date(),
    }, { transaction });

    refundRecords.push({
      customerId,
      amount,
      transactionId: transactionRecord.id,
    });
  }

  const remainingAmount = payments.reduce((sum, p) => sum + (p.customer_id === refunds.find(r => r.customerId)?.customerId ? p.amount - refunds.find(r => r.customerId === p.customer_id)?.amount : p.amount), 0);
  const statusUpdate = {};
  switch (serviceType) {
    case 'order':
    case 'in_dining_order':
      statusUpdate.payment_status = remainingAmount === 0 ? 'refunded' : 'paid';
      break;
    case 'booking':
      statusUpdate.status = remainingAmount === 0 ? mtablesConstants.BOOKING_STATUSES[3] : mtablesConstants.BOOKING_STATUSES[1];
      break;
    case 'ride':
      statusUpdate.status = remainingAmount === 0 ? rideConstants.RIDE_STATUSES[4] : rideConstants.RIDE_STATUSES[3];
      break;
    case 'event':
      statusUpdate.status = remainingAmount === 0 ? meventsConstants.EVENT_STATUSES[3] : meventsConstants.EVENT_STATUSES[1];
      break;
  }
  await service.update(statusUpdate, { transaction });

  logger.info('Refunds processed', { serviceId, serviceType, refundCount: refunds.length });
  return { serviceId, serviceType, refunds: refundRecords };
}

async function getServiceAmount(eventService, transaction) {
  switch (eventService.service_type) {
    case 'order':
      const order = await Order.findByPk(eventService.service_id, { transaction });
      return order?.total_amount || 0;
    case 'in_dining_order':
      const inDiningOrder = await InDiningOrder.findByPk(eventService.service_id, { transaction });
      return inDiningOrder?.total_amount || 0;
    case 'booking':
      const booking = await Booking.findByPk(eventService.service_id, { transaction });
      return booking?.details?.total_amount || 0;
    case 'ride':
      const ride = await Ride.findByPk(eventService.service_id, { include: [{ model: Payment, as: 'payment' }], transaction });
      return ride?.payment?.amount || 0;
    default:
      return 0;
  }
}

module.exports = { splitPayment, manageSplitPaymentRefunds, getServiceAmount };