'use strict';

const { Op } = require('sequelize');
const { sequelize, User, Customer, Wallet, Order, InDiningOrder, Booking, Ride, Event, EventService, Payment, WalletTransaction } = require('@models');
const walletService = require('@services/common/walletService');
const munchConstants = require('@constants/customer/munch/munchConstants');
const mtablesConstants = require('@constants/customer/mtables/mtablesConstants');
const mtxiConstants = require('@constants/customer/mtxi/mtxiConstants');
const meventsConstants = require('@constants/customer/mevents/meventsConstants');
const mparkConstants = require('@constants/customer/mpark/mparkConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const socialConstants = require('@constants/common/socialConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');

async function splitPayment(serviceId, serviceType, payments, billSplitType, transaction) {
  if (!socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType.toUpperCase())) {
    throw new Error('Invalid bill split type', { status: 400, code: socialConstants.ERROR_CODES.INVALID_BILL_SPLIT });
  }
  if (payments.length > socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new Error('Max split participants exceeded', { status: 400, code: socialConstants.ERROR_CODES.MAX_SPLIT_PARTICIPANTS_EXCEEDED });
  }

  let service, totalAmount = 0, merchantId, paymentField, transactionType;
  switch (serviceType) {
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) throw new Error('Order not found', { status: 404, code: munchConstants.ERROR_CODES.ORDER_NOT_FOUND });
      totalAmount = service.total_amount;
      merchantId = service.merchant_id;
      paymentField = 'order_id';
      transactionType = paymentConstants.TRANSACTION_TYPES.ORDER_PAYMENT;
      break;
    case 'in_dining_order':
      service = await InDiningOrder.findByPk(serviceId, { include: [{ model: Customer, as: 'customer' }], transaction });
      if (!service) throw new Error('In-dining order not found', { status: 404, code: munchConstants.ERROR_CODES.ORDER_NOT_FOUND });
      totalAmount = service.total_amount;
      merchantId = service.branch_id ? (await service.getBranch({ transaction }))?.merchant_id : null;
      if (!merchantId) throw new Error('Merchant ID required for in-dining order', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD });
      paymentField = 'in_dining_order_id';
      transactionType = paymentConstants.TRANSACTION_TYPES.ORDER_PAYMENT;
      break;
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) throw new Error('Booking not found', { status: 404, code: mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND });
      totalAmount = service.details?.total_amount || 0;
      merchantId = service.merchant_id;
      paymentField = null;
      transactionType = paymentConstants.TRANSACTION_TYPES.BOOKING_PAYMENT;
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { include: [{ model: Payment, as: 'payment' }], transaction });
      if (!service) throw new Error('Ride not found', { status: 404, code: mtxiConstants.ERROR_TYPES.RIDE_NOT_FOUND });
      totalAmount = service.payment?.amount || 0;
      merchantId = null;
      paymentField = null;
      transactionType = paymentConstants.TRANSACTION_TYPES.RIDE_PAYMENT;
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { include: [{ model: EventService, as: 'services', include: [Order, InDiningOrder, Booking, Ride] }], transaction });
      if (!service) throw new Error('Event not found', { status: 404, code: meventsConstants.ERROR_CODES.EVENT_NOT_FOUND });
      if (service.payment_type !== 'split') {
        throw new Error('Invalid payment type for event', { status: 400, code: meventsConstants.ERROR_CODES.INVALID_PAYMENT_TYPE });
      }
      for (const eventService of service.services) {
        switch (eventService.service_type) {
          case 'munch':
            const order = await Order.findByPk(eventService.service_id, { transaction });
            totalAmount += order?.total_amount || 0;
            merchantId = order?.merchant_id;
            break;
          case 'in_dining':
            const inDiningOrder = await InDiningOrder.findByPk(eventService.service_id, { transaction });
            totalAmount += inDiningOrder?.total_amount || 0;
            merchantId = inDiningOrder?.branch_id ? (await inDiningOrder.getBranch({ transaction }))?.merchant_id : null;
            if (!merchantId) throw new Error('Merchant ID required for in-dining order in event', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD });
            break;
          case 'mtables':
            const booking = await Booking.findByPk(eventService.service_id, { transaction });
            totalAmount += booking?.details?.total_amount || 0;
            merchantId = booking?.merchant_id;
            break;
          case 'mtxi':
            const ride = await Ride.findByPk(eventService.service_id, { include: [{ model: Payment, as: 'payment' }], transaction });
            totalAmount += ride?.payment?.amount || 0;
            merchantId = null;
            break;
          case 'mpark':
            const parking = await Parking.findByPk(eventService.service_id, { transaction });
            totalAmount += parking?.details?.total_amount || 0;
            merchantId = parking?.merchant_id;
            break;
          default:
            throw new Error('Invalid event service type', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD });
        }
      }
      paymentField = null;
      transactionType = paymentConstants.TRANSACTION_TYPES.EVENT_PAYMENT;
      break;
    default:
      throw new Error('Invalid service type', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD });
  }

  const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPayment !== totalAmount && totalAmount > 0) {
    throw new Error('Total payment amount does not match service amount', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_AMOUNT });
  }

  const splitPayments = [];
  const processedCustomerIds = new Set();

  for (const payment of payments) {
    const { customerId, amount, paymentMethod } = payment;

    if (processedCustomerIds.has(customerId)) {
      throw new Error('Duplicate customer in payment', { status: 400, code: socialConstants.ERROR_CODES.INVALID_BILL_SPLIT });
    }
    processedCustomerIds.add(customerId);

    const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
    if (!user || !user.customer_profile) {
      throw new Error('Invalid customer', { status: 400, code: socialConstants.ERROR_CODES.INVALID_CUSTOMER });
    }

    const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet) {
      throw new Error('Wallet not found', { status: 404, code: paymentConstants.ERROR_CODES.WALLET_NOT_FOUND });
    }
    if (!paymentConstants.PAYMENT_METHODS.includes(paymentMethod.toUpperCase())) {
      throw new Error('Invalid payment method', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD });
    }
    if (wallet.balance < amount) {
      throw new Error('Insufficient funds in wallet', { status: 400, code: paymentConstants.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS });
    }
    if (wallet.currency !== localizationConstants.DEFAULT_CURRENCY) {
      throw new Error('Currency mismatch', { status: 400, code: paymentConstants.ERROR_CODES.CURRENCY_MISMATCH });
    }

    const financialLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === transactionType);
    if (amount < financialLimit.min || amount > financialLimit.max) {
      throw new Error('Amount outside allowed range', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_AMOUNT });
    }

    const transactionRecord = await walletService.processTransaction({
      walletId: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT,
      amount,
      currency: wallet.currency,
      paymentMethod: paymentMethod.toUpperCase(),
      description: `Split payment for ${serviceType} #${serviceId}`,
    }, transaction);

    await WalletTransaction.update(
      { status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
      { where: { id: transactionRecord.id }, transaction }
    );

    const paymentData = {
      customer_id: customerId,
      merchant_id: merchantId,
      amount,
      payment_method: paymentMethod.toUpperCase(),
      status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
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
      statusUpdate.payment_status = munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('refunded') && totalAmount === 0 ? 'REFUNDED' : 'COMPLETED';
      break;
    case 'booking':
      statusUpdate.status = mtablesConstants.BOOKING_STATUSES.includes('cancelled') && totalAmount === 0 ? 'CANCELLED' : 'CONFIRMED';
      break;
    case 'ride':
      statusUpdate.status = mtxiConstants.RIDE_STATUSES.includes('CANCELLED') && totalAmount === 0 ? 'CANCELLED' : 'COMPLETED';
      break;
    case 'event':
      statusUpdate.status = meventsConstants.EVENT_STATUSES.includes('cancelled') && totalAmount === 0 ? 'cancelled' : 'confirmed';
      break;
  }
  await service.update(statusUpdate, { transaction });

  logger.info('Split payment processed', { serviceId, serviceType, splitCount: payments.length });
  return { serviceId, serviceType, billSplitType, splitPayments };
}

async function manageSplitPaymentRefunds(serviceId, serviceType, refunds, transaction) {
  let service, paymentQuery;
  switch (serviceType) {
    case 'order':
      service = await Order.findByPk(serviceId, { transaction });
      if (!service) throw new Error('Order not found', { status: 404, code: munchConstants.ERROR_CODES.ORDER_NOT_FOUND });
      paymentQuery = { order_id: serviceId };
      break;
    case 'in_dining_order':
      service = await InDiningOrder.findByPk(serviceId, { transaction });
      if (!service) throw new Error('In-dining order not found', { status: 404, code: munchConstants.ERROR_CODES.ORDER_NOT_FOUND });
      paymentQuery = { in_dining_order_id: serviceId };
      break;
    case 'booking':
      service = await Booking.findByPk(serviceId, { transaction });
      if (!service) throw new Error('Booking not found', { status: 404, code: mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND });
      paymentQuery = { customer_id: service.customer_id, merchant_id: service.merchant_id };
      break;
    case 'ride':
      service = await Ride.findByPk(serviceId, { transaction });
      if (!service) throw new Error('Ride not found', { status: 404, code: mtxiConstants.ERROR_TYPES.RIDE_NOT_FOUND });
      paymentQuery = { id: service.paymentId };
      break;
    case 'event':
      service = await Event.findByPk(serviceId, { include: [{ model: EventService, as: 'services' }], transaction });
      if (!service) throw new Error('Event not found', { status: 404, code: meventsConstants.ERROR_CODES.EVENT_NOT_FOUND });
      paymentQuery = { id: { [Op.in]: service.services.map(s => s.payment_id).filter(id => id) } };
      break;
    default:
      throw new Error('Invalid service type', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD });
  }

  const payments = await Payment.findAll({ where: paymentQuery, transaction });
  if (!payments.length) {
    throw new Error('No payments found', { status: 404, code: paymentConstants.ERROR_CODES.TRANSACTION_FAILED });
  }

  const refundRecords = [];
  const processedCustomerIds = new Set();

  for (const refund of refunds) {
    const { customerId, amount } = refund;

    if (processedCustomerIds.has(customerId)) {
      throw new Error('Duplicate customer in refund', { status: 400, code: socialConstants.ERROR_CODES.INVALID_BILL_SPLIT });
    }
    processedCustomerIds.add(customerId);

    const user = await User.findByPk(customerId, { include: [{ model: Customer, as: 'customer_profile' }], transaction });
    if (!user || !user.customer_profile) {
      throw new Error('Invalid customer', { status: 400, code: socialConstants.ERROR_CODES.INVALID_CUSTOMER });
    }

    const payment = payments.find(p => p.customer_id === customerId);
    if (!payment) {
      throw new Error('Payment not found', { status: 404, code: paymentConstants.ERROR_CODES.TRANSACTION_FAILED });
    }
    if (amount > payment.amount) {
      throw new Error('Refund amount exceeds payment', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_AMOUNT });
    }

    const wallet = await Wallet.findOne({ where: { user_id: customerId }, transaction });
    if (!wallet) {
      throw new Error('Wallet not found', { status: 404, code: paymentConstants.ERROR_CODES.WALLET_NOT_FOUND });
    }

    const financialLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === paymentConstants.TRANSACTION_TYPES.REFUND);
    if (amount < financialLimit.min || amount > financialLimit.max) {
      throw new Error('Refund amount outside allowed range', { status: 400, code: paymentConstants.ERROR_CODES.INVALID_AMOUNT });
    }

    const transactionRecord = await walletService.processTransaction({
      walletId: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.REFUND,
      amount,
      currency: wallet.currency,
      paymentMethod: payment.payment_method,
      description: `Refund for ${serviceType} #${serviceId}`,
    }, transaction);

    await WalletTransaction.update(
      { status: paymentConstants.TRANSACTION_STATUSES.COMPLETED },
      { where: { id: transactionRecord.id }, transaction }
    );

    const newAmount = payment.amount - amount;
    await payment.update({
      amount: newAmount,
      status: newAmount === 0 ? paymentConstants.TRANSACTION_STATUSES.REFUNDED : paymentConstants.TRANSACTION_STATUSES.COMPLETED,
      refund_status: paymentConstants.PAYMENT_STATUSES[3], // REFUNDED
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
      statusUpdate.payment_status = remainingAmount === 0 ? munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[7] : munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[2]; // REFUNDED or COMPLETED
      break;
    case 'booking':
      statusUpdate.status = remainingAmount === 0 ? mtablesConstants.BOOKING_STATUSES[4] : mtablesConstants.BOOKING_STATUSES[1]; // CANCELLED or CONFIRMED
      break;
    case 'ride':
      statusUpdate.status = remainingAmount === 0 ? mtxiConstants.RIDE_STATUSES[4] : mtxiConstants.RIDE_STATUSES[3]; // CANCELLED or COMPLETED
      break;
    case 'event':
      statusUpdate.status = remainingAmount === 0 ? meventsConstants.EVENT_STATUSES[4] : meventsConstants.EVENT_STATUSES[1]; // cancelled or confirmed
      break;
  }
  await service.update(statusUpdate, { transaction });

  logger.info('Refunds processed', { serviceId, serviceType, refundCount: refunds.length });
  return { serviceId, serviceType, refunds: refundRecords };
}

async function getServiceAmount(eventService, transaction) {
  switch (eventService.service_type) {
    case 'munch':
      const order = await Order.findByPk(eventService.service_id, { transaction });
      return order?.total_amount || 0;
    case 'in_dining':
      const inDiningOrder = await InDiningOrder.findByPk(eventService.service_id, { transaction });
      return inDiningOrder?.total_amount || 0;
    case 'mtables':
      const booking = await Booking.findByPk(eventService.service_id, { transaction });
      return booking?.details?.total_amount || 0;
    case 'mtxi':
      const ride = await Ride.findByPk(eventService.service_id, { include: [{ model: Payment, as: 'payment' }], transaction });
      return ride?.payment?.amount || 0;
    case 'mpark':
      const parking = await Parking.findByPk(eventService.service_id, { transaction });
      return parking?.details?.total_amount || 0;
    default:
      return 0;
  }
}

module.exports = { splitPayment, manageSplitPaymentRefunds, getServiceAmount };