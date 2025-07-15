// src/services/customer/mtables/preOrderService.js
'use strict';

const { Op } = require('sequelize');
const {
  Booking,
  Customer,
  BookingPartyMember,
  InDiningOrder,
  PaymentRequest,
  Wallet,
  MenuInventory,
  ProductDiscount,
  ProductModifier,
  OrderItems,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const customerWalletConstants = require('@constants/customer/customerWalletConstants');
const socialConstants = require('@constants/common/socialConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

async function createPreOrder({ bookingId, items, dietaryPreferences, paymentMethodId, recommendationData, transaction }) {
  if (!bookingId || !items || !Array.isArray(items) || items.length === 0) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  const booking = await Booking.findByPk(bookingId, {
    include: [{ model: Table, as: 'table', include: [{ model: MerchantBranch, as: 'branch' }] }],
    transaction,
  });
  if (!booking || !customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.includes(booking.status) || booking.status === 'cancelled' || booking.status === 'no_show') {
    throw new Error(mtablesConstants.ERROR_TYPES[26]); // INVALID_BOOKING_STATUS
  }

  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
  const leadTimeMinutes = dateTimeUtils.getTimeDifference(new Date(), bookingDateTime) / 60;
  if (leadTimeMinutes < customerConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.MIN_PRE_ORDER_LEAD_TIME_MINUTES) {
    throw new Error(mtablesConstants.ERROR_TYPES[27]); // PRE_ORDER_LEAD_TIME_INSUFFICIENT
  }

  if (dietaryPreferences && !dietaryPreferences.every(pref => customerConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new Error(mtablesConstants.ERROR_TYPES[11]); // INVALID_DIETARY_FILTER
  }

  if (paymentMethodId) {
    if (!customerWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS.includes(paymentMethodId)) {
      throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS (used as a general error here for invalid payment method)
    }
  }

  let totalAmount = 0;
  const orderItems = [];
  let maxPreparationTime = 0;

  for (const item of items) {
    const { menuItemId, quantity, customizations } = item;
    if (!menuItemId || !quantity || quantity < mtablesConstants.CART_SETTINGS.MIN_QUANTITY_PER_ITEM || quantity > mtablesConstants.CART_SETTINGS.MAX_QUANTITY_PER_ITEM) {
      throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
    }

    const menuItem = await MenuInventory.findByPk(menuItemId, {
      where: { branch_id: booking.branch_id, availability_status: 'in-stock' },
      include: [
        { model: ProductDiscount, as: 'discounts', where: { is_active: true, start_date: { [Op.lte]: new Date() }, [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: new Date() } }] }, required: false },
        { model: ProductModifier, as: 'modifiers', where: { type: { [Op.in]: mtablesConstants.MODIFIER_TYPES } } },
      ],
      transaction,
    });
    if (!menuItem) {
      throw new Error(mtablesConstants.ERROR_TYPES[23]); // INVALID_MENU_ITEM
    }

    if (customizations) {
      const validModifiers = menuItem.modifiers.map(modifier => modifier.id);
      for (const customization of customizations) {
        if (!validModifiers.includes(customization.modifierId)) {
          throw new Error(mtablesConstants.ERROR_TYPES[25]); // INVALID_CUSTOMIZATIONS
        }
      }
    }

    const finalPrice = menuItem.calculateFinalPrice();
    totalAmount += finalPrice * quantity;

    if (menuItem.preparation_time_minutes && menuItem.preparation_time_minutes > maxPreparationTime) {
      maxPreparationTime = menuItem.preparation_time_minutes;
    }

    orderItems.push({
      order_id: null,
      menu_item_id: menuItemId,
      quantity,
      customization: customizations ? JSON.stringify(customizations) : null,
    });
  }

  if (totalAmount < customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_DEPOSIT_AMOUNT || totalAmount > customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MAX_DEPOSIT_AMOUNT) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS (used for invalid amount range)
  }

  const customerWallet = await Wallet.findOne({
    where: { customer_id: booking.customer_id, currency: customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.DEFAULT_CURRENCY },
    transaction,
  });
  if (!customerWallet) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS (used for wallet not found)
  }
  if (paymentMethodId && customerWallet.balance < totalAmount) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS
  }

  const orderNumber = `PRE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const estimatedCompletionTime = maxPreparationTime ? dateTimeUtils.addDaysToDate(new Date(), 0, maxPreparationTime * 60) : null;

  const order = await InDiningOrder.create(
    {
      customer_id: booking.customer_id,
      branch_id: booking.branch_id,
      table_id: booking.table_id,
      order_number: orderNumber,
      order_type: customerConstants.MUNCH_CONSTANTS.ORDER_TYPES[3], // pre_order
      status: customerConstants.MUNCH_CONSTANTS.ORDER_STATUSES[0], // pending
      preparation_status: mtablesConstants.ORDER_STATUSES[0], // pending
      total_amount: totalAmount.toFixed(2),
      currency: customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.DEFAULT_CURRENCY,
      payment_status: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[0], // pending
      payment_method_id: paymentMethodId || null,
      notes: dietaryPreferences ? JSON.stringify({ dietaryPreferences }) : null,
      recommendation_data: recommendationData ? JSON.stringify(recommendationData) : null,
      estimated_completion_time: estimatedCompletionTime,
    },
    { transaction }
  );

  for (const orderItem of orderItems) {
    orderItem.order_id = order.id;
    await OrderItems.create(orderItem, { transaction });
  }

  return { order };
}

async function sendPreOrderRequestToFriends({ bookingId, orderId, amount, billSplitType, transaction }) {
  if (!bookingId || !orderId || !amount || !billSplitType) {
    throw new Error(mtablesConstants.ERROR_TYPES[0]); // INVALID_INPUT
  }

  if (!socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType)) {
    throw new Error(socialConstants.ERROR_CODES[17]); // INVALID_BILL_SPLIT
  }

  if (amount < customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_DEPOSIT_AMOUNT || amount > customerWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MAX_DEPOSIT_AMOUNT) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS (used for invalid amount range)
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  const order = await InDiningOrder.findByPk(orderId, {
    include: [{ model: MerchantBranch, as: 'branch' }],
    transaction,
  });
  if (!order || order.order_type !== customerConstants.MUNCH_CONSTANTS.ORDER_TYPES[3]) {
    throw new Error(mtablesConstants.ERROR_TYPES[24]); // ORDER_NOT_FOUND
  }

  const partyMembers = await BookingPartyMember.findAll({
    where: {
      booking_id: bookingId,
      status: customerConstants.SOCIAL_CONSTANTS.GROUP_CHAT_SETTINGS.INVITE_STATUSES[1], // ACCEPTED
    },
    transaction,
  });

  const totalParticipants = partyMembers.length + 1; // Include booking owner
  if (totalParticipants > customerWalletConstants.WALLET_CONSTANTS.BILL_SPLIT_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[3]); // MAX_SPLIT_PARTICIPANTS_EXCEEDED
  }

  const customerIds = [booking.customer_id, ...partyMembers.map(member => member.customer_id)];
  const customers = await Customer.findAll({
    where: { id: { [Op.in]: customerIds }, status: customerConstants.CUSTOMER_STATUSES[0] }, // active
    include: [{ model: Wallet, as: 'wallet', where: { currency: order.currency } }],
    transaction,
  });

  if (customers.length !== customerIds.length) {
    throw new Error(mtablesConstants.ERROR_TYPES[10]); // INVALID_CUSTOMER_ID
  }
  if (customers.some(customer => !customer.wallet)) {
    throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_NOT_FOUND
  }

  const splitAmount = billSplitType === 'equal' ? (amount / totalParticipants).toFixed(2) : amount;
  const paymentRequests = [];

  for (const customer of customers) {
    if (customer.wallet.balance < splitAmount) {
      throw new Error(customerWalletConstants.WALLET_CONSTANTS.ERROR_CODES[0]); // WALLET_INSUFFICIENT_FUNDS
    }

    const reference = `PR-PRE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const paymentRequest = await PaymentRequest.create(
      {
        booking_id: bookingId,
        customer_id: customer.id,
        order_id: orderId,
        amount: splitAmount,
        currency: order.currency,
        status: customerWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[0], // pending
        reference,
        transaction_type: customerWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[9], // social_bill_split
      },
      { transaction }
    );
    paymentRequests.push(paymentRequest);
  }

  return { paymentRequests, order };
}

module.exports = {
  createPreOrder,
  sendPreOrderRequestToFriends,
};