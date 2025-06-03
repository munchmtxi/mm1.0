'use strict';

const { sequelize } = require('@models');
const { Customer, Booking, Wallet, Transaction, BookingPartyMember } = require('@models');
const notificationService = require('@services/common/notificationService');
const { formatMessage } = require('@utils/localization/localization');
const mtablesConstants = require('@constants/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const logger = require('@utils/logger');

async function processPayment({ id, amount, walletId, paymentMethodId, type, transaction }) {
  if (!id || !amount || !walletId || !paymentMethodId || !type) {
    throw new Error('Missing required fields');
  }
  if (amount < mtablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT || amount > mtablesConstants.FINANCIAL_SETTINGS.MAX_DEPOSIT_AMOUNT) {
    throw new Error('Invalid deposit amount');
  }

  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) throw new Error('Wallet not found');

  const paymentMethod = await sequelize.models.PaymentMethod.findByPk(paymentMethodId, { transaction });
  if (!paymentMethod || paymentMethod.user_id !== wallet.user_id) {
    throw new Error('Invalid payment method');
  }

  const payment = await sequelize.models.Payment.create(
    {
      wallet_id: walletId,
      payment_method_id: paymentMethodId,
      amount,
      currency: wallet.currency,
      type,
      status: 'completed',
      reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  const transactionRecord = await Transaction.create(
    {
      wallet_id: walletId,
      payment_id: payment.id,
      amount,
      currency: wallet.currency,
      type: mtablesConstants.FINANCIAL_SETTINGS.DEPOSIT_TRANSACTION_TYPE,
      status: 'completed',
      reference: payment.reference,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  await wallet.update(
    { balance: wallet.balance - amount },
    { transaction }
  );

  return { payment, transaction: transactionRecord };
}

async function issueRefund({ id, walletId, transactionId, type, transaction }) {
  if (!id || !walletId || !transactionId || !type) {
    throw new Error('Missing required fields');
  }

  const wallet = await Wallet.findByPk(walletId, { transaction });
  if (!wallet) throw new Error('Wallet not found');

  const originalTransaction = await Transaction.findByPk(transactionId, { transaction });
  if (!originalTransaction || originalTransaction.wallet_id !== walletId) {
    throw new Error('Invalid transaction');
  }

  const refund = await sequelize.models.Payment.create(
    {
      wallet_id: walletId,
      payment_method_id: originalTransaction.payment_id,
      amount: originalTransaction.amount,
      currency: wallet.currency,
      type: 'refund',
      status: 'completed',
      reference: `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  const refundTransaction = await Transaction.create(
    {
      wallet_id: walletId,
      payment_id: refund.id,
      amount: originalTransaction.amount,
      currency: wallet.currency,
      type: 'refund',
      status: 'completed',
      reference: refund.reference,
      created_at: new Date(),
      updated_at: new Date(),
    },
    { transaction }
  );

  await wallet.update(
    { balance: wallet.balance + originalTransaction.amount },
    { transaction }
  );

  return { refund, transaction: refundTransaction };
}

async function sendPaymentRequest({ bookingId, amount, billSplitType, transaction }) {
  if (!bookingId || !amount || !billSplitType) {
    throw new Error('Missing required fields');
  }
  if (!mtablesConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType)) {
    throw new Error('Invalid bill split type');
  }
  if (amount < mtablesConstants.FINANCIAL_SETTINGS.MIN_DEPOSIT_AMOUNT) {
    throw new Error('Amount too low');
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking) throw new Error('Booking not found');

  const partyMembers = await BookingPartyMember.findAll({
    where: {
      booking_id: bookingId,
      status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[1], // accepted
      deleted_at: null,
    },
    transaction,
  });

  if (partyMembers.length + 1 > mtablesConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new Error('Too many participants for bill split');
  }

  let splitAmounts;
  if (billSplitType === mtablesConstants.GROUP_SETTINGS.BILL_SPLIT_TYPES[0]) { // equal
    const totalParticipants = partyMembers.length + 1; // Include booking owner
    splitAmounts = Array(totalParticipants).fill(amount / totalParticipants);
  } else {
    throw new Error('Only equal bill splitting is currently supported');
  }

  const paymentRequests = [];
  for (const [index, member] of partyMembers.entries()) {
    const customer = await Customer.findByPk(member.customer_id, { transaction });
    if (!customer) throw new Error(`Customer ${member.customer_id} not found`);

    const wallet = await Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
    if (!wallet) throw new Error(`Wallet not found for customer ${member.customer_id}`);

    const paymentRequest = await sequelize.models.PaymentRequest.create(
      {
        booking_id: bookingId,
        customer_id: member.customer_id,
        amount: splitAmounts[index],
        currency: wallet.currency,
        status: 'pending',
        reference: `PRQ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    const message = formatMessage({
      role: 'customer',
      module: 'mtables',
      languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      messageKey: 'payment.requested',
      params: { bookingId, amount: splitAmounts[index] },
    });

    await notificationService.createNotification(
      {
        userId: customer.user_id,
        type: customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.payment_request,
        message,
        priority: 'HIGH',
        languageCode: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      },
      transaction
    );

    paymentRequests.push(paymentRequest);
  }

  return paymentRequests;
}

module.exports = {
  processPayment,
  issueRefund,
  sendPaymentRequest,
};