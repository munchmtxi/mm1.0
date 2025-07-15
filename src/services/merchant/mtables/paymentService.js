'use strict';

const { Booking, Customer, InDiningOrder, Staff, MerchantBranch, Wallet, Payment, WalletTransaction, Table, Merchant, BookingPartyMember } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const merchantWalletConstants = require('@constants/merchant/merchantWalletConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const taxConstants = require('@constants/common/taxConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

async function processPayment(bookingId, amount, walletId, { staffId, paymentMethodId, countryCode } = {}) {
  const transaction = await sequelize.transaction();
  try {
    // Validate booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InDiningOrder, as: 'inDiningOrders' },
        { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
        { model: Table, as: 'table' },
        { model: Staff, as: 'staff' },
        { model: BookingPartyMember, as: 'BookingPartyMembers' },
      ],
      transaction,
    });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate order
    const order = booking.inDiningOrders?.find(o => o.payment_status === mtablesConstants.ORDER_STATUSES.PENDING);
    if (!order) throw new AppError('No pending order found', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate amount
    if (amount <= 0 || amount > order.total_amount)
      throw new AppError('Invalid payment amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);

    // Validate wallet
    const wallet = await Wallet.findByPk(walletId, {
      include: [{ model: Customer, as: 'user' }, { model: Staff, as: 'staff' }, { model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!wallet || wallet.user_id !== booking.customer.user_id)
      throw new AppError('Invalid wallet or user mismatch', 400, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
    if (wallet.balance < amount)
      throw new AppError('Insufficient wallet balance', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);
    if (wallet.balance + amount > paymentConstants.WALLET_SETTINGS.MAX_BALANCE)
      throw new AppError('Wallet balance exceeds maximum', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);

    // Validate payment method
    if (paymentMethodId && !customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS.includes(paymentMethodId))
      throw new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);

    // Validate staff
    const staff = staffId
      ? await Staff.findOne({
          where: { id: staffId, availability_status: staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
          include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }],
          transaction,
        })
      : null;
    if (staffId && !staff)
      throw new AppError('Invalid staff or unavailable', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    if (staff && !staffConstants.STAFF_PERMISSIONS[staff.role]?.includes('process_orders'))
      throw new AppError('Staff lacks permission', 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);

    // Validate currency
    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;
    if (order.currency !== currency)
      throw new AppError('Currency mismatch', 400, paymentConstants.ERROR_CODES.CURRENCY_MISMATCH);

    // Calculate tax
    const taxRate = taxConstants.TAX_RATES[countryCode]?.[taxConstants.TAX_SETTINGS.DEFAULT_TAX_TYPE] || 0;
    const taxAmount = taxConstants.TAX_SETTINGS.TAX_CALCULATION_METHODS.INCLUDED === 'INCLUDED'
      ? amount - (amount / (1 + taxRate))
      : amount * taxRate;
    const netAmount = amount - taxAmount;

    // Create transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create payment
    const payment = await Payment.create(
      {
        in_dining_order_id: order.id,
        customer_id: booking.customer_id,
        merchant_id: booking.branch.merchant_id,
        staff_id: staff?.id,
        amount: netAmount,
        tax_amount: taxAmount,
        payment_method: paymentMethodId || customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0],
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        transaction_id: transactionId,
        currency,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // Create wallet transaction
    await WalletTransaction.create(
      {
        wallet_id: walletId,
        type: paymentConstants.TRANSACTION_TYPES.BOOKING_PAYMENT,
        amount: netAmount,
        tax_amount: taxAmount,
        currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        payment_method_id: paymentMethodId,
        description: `Payment for order ${order.id}`,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // Update wallet balance
    await wallet.update({ balance: wallet.balance - amount }, { transaction });

    // Update order status
    if (amount === order.total_amount)
      await order.update({ payment_status: mtablesConstants.ORDER_STATUSES.COMPLETED }, { transaction });

    await transaction.commit();
    logger.info('Payment processed', { orderId: order.id, paymentId: payment.id, amount });
    return payment;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error processing payment', { error: error.message });
    throw error;
  }
}

async function manageSplitPayments(bookingId, payments, { staffId, countryCode } = {}) {
  const transaction = await sequelize.transaction();
  try {
    // Validate booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: InDiningOrder, as: 'inDiningOrders' },
        { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
        { model: Table, as: 'table' },
        { model: Staff, as: 'staff' },
        { model: BookingPartyMember, as: 'BookingPartyMembers' },
      ],
      transaction,
    });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate order
    const order = booking.inDiningOrders?.find(o => o.payment_status === mtablesConstants.ORDER_STATUSES.PENDING);
    if (!order) throw new AppError('No pending order found', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate split payment total
    const totalSplit = payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalSplit !== order.total_amount)
      throw new AppError('Split payment total mismatch', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.INVALID_BILL_SPLIT);

    // Validate split participants
    if (payments.length > mtablesConstants.GROUP_SETTINGS.MAX_SPLIT_PARTICIPANTS)
      throw new AppError('Max split participants exceeded', 400, customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES.MAX_SPLIT_PARTICIPANTS_EXCEEDED);

    // Validate staff
    const staff = staffId
      ? await Staff.findOne({
          where: { id: staffId, availability_status: staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
          include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }],
          transaction,
        })
      : null;
    if (staffId && !staff)
      throw new AppError('Invalid staff or unavailable', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    if (staff && !staffConstants.STAFF_PERMISSIONS[staff.role]?.includes('process_orders'))
      throw new AppError('Staff lacks permission', 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);

    // Validate currency
    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;
    if (order.currency !== currency)
      throw new AppError('Currency mismatch', 400, paymentConstants.ERROR_CODES.CURRENCY_MISMATCH);

    // Calculate tax
    const taxRate = taxConstants.TAX_RATES[countryCode]?.[taxConstants.TAX_SETTINGS.DEFAULT_TAX_TYPE] || 0;
    const paymentRecords = [];

    for (const payment of payments) {
      const { customerId, amount, walletId, paymentMethodId } = payment;

      // Validate customer
      const customer = await Customer.findByPk(customerId, {
        include: [{ model: BookingPartyMember, where: { booking_id: bookingId } }],
        transaction,
      });
      if (!customer) throw new AppError('Invalid customer ID', 404, mtablesConstants.ERROR_TYPES.INVALID_CUSTOMER_ID);

      // Validate wallet
      const wallet = await Wallet.findByPk(walletId, {
        include: [{ model: Customer, as: 'user' }],
        transaction,
      });
      if (!wallet || wallet.user_id !== customer.user_id)
        throw new AppError('Invalid wallet or user mismatch', 400, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
      if (wallet.balance < amount)
        throw new AppError('Insufficient wallet balance', 400, paymentConstants.ERROR_CODES.INSUFFICIENT_FUNDS);

      // Validate payment method
      if (paymentMethodId && !customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS.includes(paymentMethodId))
        throw new AppError('Invalid payment method', 400, paymentConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);

      // Calculate tax for split payment
      const taxAmount = taxConstants.TAX_SETTINGS.TAX_CALCULATION_METHODS.INCLUDED === 'INCLUDED'
        ? amount - (amount / (1 + taxRate))
        : amount * taxRate;
      const netAmount = amount - taxAmount;

      // Create transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Create payment
      const paymentRecord = await Payment.create(
        {
          in_dining_order_id: order.id,
          customer_id: customerId,
          merchant_id: booking.branch.merchant_id,
          staff_id: staff?.id,
          amount: netAmount,
          tax_amount: taxAmount,
          payment_method: paymentMethodId || customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0],
          status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
          transaction_id: transactionId,
          currency,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );

      // Create wallet transaction
      await WalletTransaction.create(
        {
          wallet_id: walletId,
          type: paymentConstants.TRANSACTION_TYPES.SOCIAL_BILL_SPLIT,
          amount: netAmount,
          tax_amount: taxAmount,
          currency,
          status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
          payment_method_id: paymentMethodId,
          description: `Split payment for order ${order.id}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction }
      );

      // Update wallet balance
      await wallet.update({ balance: wallet.balance - amount }, { transaction });
      paymentRecords.push(paymentRecord);
    }

    // Update order status
    await order.update({ payment_status: mtablesConstants.ORDER_STATUSES.COMPLETED }, { transaction });
    await transaction.commit();
    logger.info('Split payments processed', { orderId: order.id, paymentIds: paymentRecords.map(p => p.id) });
    return { payments: paymentRecords, order };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error managing split payments', { error: error.message });
    throw error;
  }
}

async function issueRefund(bookingId, walletId, { amount, staffId, countryCode } = {}) {
  const transaction = await sequelize.transaction();
  try {
    // Validate booking
    const booking = await Booking.findByPk(bookingId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InDiningOrder, as: 'inDiningOrders', include: [{ model: Payment, as: 'inDiningOrder' }] },
        { model: MerchantBranch, as: 'branch', include: [{ model: Merchant, as: 'merchant' }] },
        { model: Table, as: 'table' },
        { model: Staff, as: 'staff' },
        { model: BookingPartyMember, as: 'BookingPartyMembers' },
      ],
      transaction,
    });
    if (!booking) throw new AppError('Booking not found', 404, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate order
    const order = booking.inDiningOrders?.find(o => o.payment_status === mtablesConstants.ORDER_STATUSES.COMPLETED);
    if (!order) throw new AppError('No completed order found', 400, mtablesConstants.ERROR_TYPES.BOOKING_NOT_FOUND);

    // Validate refund amount
    const totalPaid = order.inDiningOrder.reduce((sum, p) => sum + p.amount, 0);
    if (!amount || amount <= 0 || amount > totalPaid)
      throw new AppError('Invalid refund amount', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);

    // Validate wallet
    const wallet = await Wallet.findByPk(walletId, {
      include: [{ model: Customer, as: 'user' }, { model: Staff, as: 'staff' }, { model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!wallet || wallet.user_id !== booking.customer.user_id)
      throw new AppError('Invalid wallet or user mismatch', 400, paymentConstants.ERROR_CODES.WALLET_NOT_FOUND);
    if (wallet.balance + amount > paymentConstants.WALLET_SETTINGS.MAX_BALANCE)
      throw new AppError('Wallet balance exceeds maximum', 400, paymentConstants.ERROR_CODES.INVALID_AMOUNT);

    // Validate staff
    const staff = staffId
      ? await Staff.findOne({
          where: { id: staffId, availability_status: staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES.AVAILABLE },
          include: [{ model: Merchant, as: 'merchant' }, { model: MerchantBranch, as: 'branch' }],
          transaction,
        })
      : null;
    if (staffId && !staff)
      throw new AppError('Invalid staff or unavailable', 400, mtablesConstants.ERROR_TYPES.INVALID_BOOKING_DETAILS);
    if (staff && !staffConstants.STAFF_PERMISSIONS[staff.role]?.includes('process_refunds'))
      throw new AppError('Staff lacks permission', 400, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);

    // Validate currency
    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[countryCode] || localizationConstants.DEFAULT_CURRENCY;
    if (order.currency !== currency)
      throw new AppError('Currency mismatch', 400, paymentConstants.ERROR_CODES.CURRENCY_MISMATCH);

    // Calculate tax for refund
    const taxRate = taxConstants.TAX_RATES[countryCode]?.[taxConstants.TAX_SETTINGS.DEFAULT_TAX_TYPE] || 0;
    const taxAmount = taxConstants.TAX_SETTINGS.TAX_CALCULATION_METHODS.INCLUDED === 'INCLUDED'
      ? amount - (amount / (1 + taxRate))
      : amount * taxRate;
    const netAmount = amount - taxAmount;

    // Create transaction ID
    const transactionId = `RFN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create refund payment
    const refund = await Payment.create(
      {
        in_dining_order_id: order.id,
        customer_id: booking.customer_id,
        merchant_id: booking.branch.merchant_id,
        staff_id: staff?.id,
        amount: -netAmount,
        tax_amount: -taxAmount,
        payment_method: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0],
        status: paymentConstants.TRANSACTION_STATUSES.REFUNDED,
        transaction_id: transactionId,
        currency,
        refund_status: 'processed',
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // Create wallet transaction for refund
    await WalletTransaction.create(
      {
        wallet_id: walletId,
        type: paymentConstants.TRANSACTION_TYPES.REFUND,
        amount: netAmount,
        tax_amount: taxAmount,
        currency,
        status: paymentConstants.TRANSACTION_STATUSES.COMPLETED,
        description: `Refund for order ${order.id}`,
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    // Update wallet balance
    await wallet.update({ balance: wallet.balance + amount }, { transaction });

    await transaction.commit();
    logger.info('Refund issued', { orderId: order.id, refundId: refund.id, amount });
    return refund;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error issuing refund', { error: error.message });
    throw error;
  }
}

module.exports = { processPayment, manageSplitPayments, issueRefund };