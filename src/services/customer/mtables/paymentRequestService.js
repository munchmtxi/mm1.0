'use strict';

const { Op } = require('sequelize');
const {
  Booking,
  Customer,
  Wallet,
  BookingPartyMember,
  PaymentRequest,
  InDiningOrder,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const socialConstants = require('@constants/common/socialConstants');

async function sendPaymentRequest({ bookingId, amount, billSplitType, transaction }) {
  // Input Validation
  if (!bookingId || !amount || !billSplitType) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  if (amount < paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'BOOKING_PAYMENT').min ||
      amount > paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'BOOKING_PAYMENT').max) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[3]); // INVALID_AMOUNT
  }

  if (!socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType)) {
    throw new Error(socialConstants.ERROR_CODES[17]); // INVALID_BILL_SPLIT
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[5]) { // no_show
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  const partyMembers = await BookingPartyMember.findAll({
    where: {
      booking_id: bookingId,
      status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[1], // ACCEPTED
    },
    transaction,
  });

  const totalParticipants = partyMembers.length + 1; // Include booking owner
  if (totalParticipants > customerWalletConstants.WALLET_CONSTANTS.BILL_SPLIT_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[2]); // MAX_SPLIT_PARTICIPANTS_EXCEEDED
  }

  const customerIds = [booking.customer_id, ...partyMembers.map(member => member.customer_id)];
  const customers = await Customer.findAll({
    where: { id: { [Op.in]: customerIds }, status: customerConstants.CUSTOMER_STATUSES[0] }, // active
    include: [{
      model: Wallet,
      as: 'wallet',
      where: { currency: customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.DEFAULT_CURRENCY },
    }],
    transaction,
  });

  if (customers.length !== customerIds.length) {
    throw new Error(customerConstants.ERROR_CODES[1]); // CUSTOMER_NOT_FOUND
  }
  if (customers.some(customer => !customer.wallet)) {
    throw new Error(paymentConstants.ERROR_CODES[0]); // WALLET_NOT_FOUND
  }
  if (customers.some(customer => customer.wallet.balance < amount / totalParticipants)) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS
  }

  const splitAmount = (amount / totalParticipants).toFixed(2); // EQUAL split
  const paymentRequests = [];

  for (const customer of customers) {
    const reference = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const paymentRequest = await PaymentRequest.create(
      {
        booking_id: bookingId,
        customer_id: customer.id,
        amount: splitAmount,
        currency: customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.DEFAULT_CURRENCY,
        status: paymentConstants.TRANSACTION_STATUSES[0], // PENDING
        reference,
      },
      { transaction }
    );
    paymentRequests.push(paymentRequest);
  }

  return {
    paymentRequests,
    message: customerWalletConstants.WALLET_CONSTANTS.SUCCESS_MESSAGES[2], // bill_split_completed
  };
}

async function sendPreOrderPaymentRequest({ bookingId, orderId, amount, billSplitType, transaction }) {
  // Input Validation
  if (!bookingId || !orderId || !amount || !billSplitType) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  if (amount < paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT').min ||
      amount > paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'ORDER_PAYMENT').max) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[3]); // INVALID_AMOUNT
  }

  if (!socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType)) {
    throw new Error(socialConstants.ERROR_CODES[17]); // INVALID_BILL_SPLIT
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[5]) { // no_show
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  const order = await InDiningOrder.findByPk(orderId, {
    where: { order_type: customerConstants.MUNCH_CONSTANTS.ORDER_TYPES[3] }, // pre_order
    transaction,
  });
  if (!order) {
    throw new Error(mtablesConstants.ERROR_TYPES[24]); // ORDER_NOT_FOUND
  }

  const partyMembers = await BookingPartyMember.findAll({
    where: {
      booking_id: bookingId,
      status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[1], // ACCEPTED
    },
    transaction,
  });

  const totalParticipants = partyMembers.length + 1; // Include booking owner
  if (totalParticipants > customerWalletConstants.WALLET_CONSTANTS.BILL_SPLIT_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[2]); // MAX_SPLIT_PARTICIPANTS_EXCEEDED
  }

  const customerIds = [booking.customer_id, ...partyMembers.map(member => member.customer_id)];
  const customers = await Customer.findAll({
    where: { id: { [Op.in]: customerIds }, status: customerConstants.CUSTOMER_STATUSES[0] }, // active
    include: [{
      model: Wallet,
      as: 'wallet',
      where: { currency: order.currency },
    }],
    transaction,
  });

  if (customers.length !== customerIds.length) {
    throw new Error(customerConstants.ERROR_CODES[1]); // CUSTOMER_NOT_FOUND
  }
  if (customers.some(customer => !customer.wallet)) {
    throw new Error(paymentConstants.ERROR_CODES[0]); // WALLET_NOT_FOUND
  }
  if (customers.some(customer => customer.wallet.balance < amount / totalParticipants)) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS
  }

  const splitAmount = (amount / totalParticipants).toFixed(2); // EQUAL split
  const paymentRequests = [];

  for (const customer of customers) {
    const reference = `PR-PRE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const paymentRequest = await PaymentRequest.create(
      {
        booking_id: bookingId,
        customer_id: customer.id,
        amount: splitAmount,
        currency: order.currency,
        status: paymentConstants.TRANSACTION_STATUSES[0], // PENDING
        reference,
        order_id: orderId,
      },
      { transaction }
    );
    paymentRequests.push(paymentRequest);
  }

  return {
    paymentRequests,
    order,
    message: customerWalletConstants.WALLET_CONSTANTS.SUCCESS_MESSAGES[2], // bill_split_completed
  };
}

module.exports = {
  sendPaymentRequest,
  sendPreOrderPaymentRequest,
};