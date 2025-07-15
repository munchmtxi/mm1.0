'use strict';

const { Op } = require('sequelize');
const {
  Booking,
  BookingPartyMember,
  Customer,
  PaymentRequest,
  Wallet,
} = require('@models');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const paymentConstants = require('@constants/paymentConstants');
const socialConstants = require('@constants/common/socialConstants');
const dateTimeUtils = require('@utils/dateTimeUtils');

async function invitePartyMember({ bookingId, customerId, inviterId, inviteMethod, transaction }) {
  if (!bookingId || !customerId || !inviterId || !socialConstants.SOCIAL_SETTINGS.INVITE_METHODS.includes(inviteMethod)) {
    throw new Error(socialConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  const inviter = await Customer.findByPk(inviterId, { transaction });
  if (!inviter || booking.customer_id !== inviterId) {
    throw new Error(socialConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const customer = await Customer.findByPk(customerId, { transaction });
  if (!customer) {
    throw new Error(socialConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  // Validate friend relationship and permissions
  const isFriend = await Customer.findOne({
    where: { id: customerId, friend_ids: { [Op.contains]: [inviterId] } },
    transaction,
  });
  if (!isFriend) {
    throw new Error(socialConstants.ERROR_CODES[4]); // NOT_FRIEND
  }
  if (!isFriend.permissions.includes(socialConstants.SOCIAL_SETTINGS.FRIEND_PERMISSIONS[7])) { // send_invites
    throw new Error(socialConstants.ERROR_CODES[5]); // INVALID_PERMISSIONS
  }

  const partyCount = await BookingPartyMember.count({
    where: {
      booking_id: bookingId,
      status: { [Op.in]: [mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[0], mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[1]] },
    },
    transaction,
  });
  if (partyCount + 1 >= booking.guest_count || partyCount >= socialConstants.SOCIAL_SETTINGS.GROUP_CHAT_SETTINGS.MAX_PARTICIPANTS) {
    throw new Error(mtablesConstants.ERROR_TYPES[5]); // INVALID_PARTY_SIZE
  }

  const existingMember = await BookingPartyMember.findOne({
    where: { booking_id: bookingId, customer_id: customerId },
    transaction,
  });
  if (existingMember) {
    throw new Error(mtablesConstants.ERROR_TYPES[16]); // PARTY_MEMBER_ALREADY_INVITED
  }

  const partyMember = await BookingPartyMember.create(
    {
      booking_id: bookingId,
      customer_id: customerId,
      status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[0], // PENDING
      invite_method: inviteMethod,
    },
    { transaction }
  );

  return { partyMember, booking, message: socialConstants.SUCCESS_MESSAGES[5] }; // INVITE_SENT
}

async function updatePartyMemberStatus({ bookingId, customerId, status, transaction }) {
  if (!mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES.includes(status)) {
    throw new Error(socialConstants.ERROR_CODES[15]); // INVALID_INVITE
  }

  const partyMember = await BookingPartyMember.findOne({
    where: { booking_id: bookingId, customer_id: customerId },
    include: [{ model: Booking, as: 'Booking' }],
    transaction,
  });
  if (!partyMember || partyMember.Booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  if (partyMember.status === status) {
    return { partyMember };
  }

  await partyMember.update({ status, updated_at: new Date() }, { transaction });

  if (status === mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[2]) { // DECLINED
    await partyMember.destroy({ transaction });
  }

  return { partyMember };
}

async function removePartyMember({ bookingId, customerId, inviterId, transaction }) {
  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status === customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[4]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }

  if (booking.customer_id !== inviterId) {
    throw new Error(socialConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const partyMember = await BookingPartyMember.findOne({
    where: { booking_id: bookingId, customer_id: customerId },
    transaction,
  });
  if (!partyMember) {
    throw new Error(mtablesConstants.ERROR_TYPES[17]); // PARTY_MEMBER_NOT_FOUND
  }

  await partyMember.update(
    { status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[3], deleted_at: new Date() }, // REMOVED
    { transaction }
  );
  await partyMember.destroy({ transaction });

  return { booking };
}

async function splitBill({ bookingId, customerIds, inviterId, amount, currency, billSplitType, transaction }) {
  if (!bookingId || !customerIds || !inviterId || !amount || !currency || !socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES.includes(billSplitType)) {
    throw new Error(socialConstants.ERROR_CODES[17]); // INVALID_BILL_SPLIT
  }
  if (!paymentConstants.WALLET_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new Error(mtablesConstants.ERROR_TYPES[18]); // INVALID_CURRENCY
  }
  if (amount <= 0 || amount > paymentConstants.WALLET_SETTINGS.MAX_SPLIT_AMOUNT) {
    throw new Error(mtablesConstants.ERROR_TYPES[19]); // INVALID_AMOUNT
  }
  if (customerIds.length > socialConstants.SOCIAL_SETTINGS.MAX_SPLIT_PARTICIPANTS) {
    throw new Error(socialConstants.ERROR_CODES[17]); // INVALID_BILL_SPLIT
  }

  const booking = await Booking.findByPk(bookingId, { transaction });
  if (!booking || booking.status !== customerConstants.MTABLES_CONSTANTS.BOOKING_STATUSES[2]) {
    throw new Error(mtablesConstants.ERROR_TYPES[7]); // BOOKING_NOT_FOUND
  }
  if (booking.customer_id !== inviterId) {
    throw new Error(socialConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const customers = await Customer.findAll({
    where: { id: { [Op.in]: customerIds }, permissions: { [Op.contains]: [socialConstants.SOCIAL_SETTINGS.FRIEND_PERMISSIONS[6]] } }, // split_payment
    include: [{ model: Wallet, as: 'wallet', where: { currency } }],
    transaction,
  });
  if (customers.length !== customerIds.length) {
    throw new Error(socialConstants.ERROR_CODES[0]); // INVALID_CUSTOMER
  }

  const partyMembers = await BookingPartyMember.findAll({
    where: {
      booking_id: bookingId,
      customer_id: { [Op.in]: customerIds },
      status: mtablesConstants.GROUP_SETTINGS.INVITE_STATUSES[1], // ACCEPTED
    },
    transaction,
  });
  if (partyMembers.length !== customerIds.length) {
    throw new Error(mtablesConstants.ERROR_TYPES[17]); // PARTY_MEMBER_NOT_FOUND
  }

  let paymentRequests = [];
  if (billSplitType === socialConstants.SOCIAL_SETTINGS.BILL_SPLIT_TYPES[0]) { // EQUAL
    const splitAmount = (amount / (customerIds.length + 1)).toFixed(2); // +1 for inviter
    paymentRequests = await Promise.all(
      customers.map(async (customer) => {
        if (customer.wallet.balance < splitAmount) {
          throw new Error(mtablesConstants.ERROR_TYPES[20]); // INSUFFICIENT_BALANCE
        }
        const reference = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        return await PaymentRequest.create(
          {
            booking_id: bookingId,
            customer_id: customer.id,
            amount: splitAmount,
            currency,
            status: 'pending',
            reference,
            bill_split_type: billSplitType,
          },
          { transaction }
        );
      })
    );
  } else {
    // Placeholder for other split types (CUSTOM, ITEMIZED, PERCENTAGE, SPONSOR_CONTRIBUTION)
    throw new Error(socialConstants.ERROR_CODES[17]); // INVALID_BILL_SPLIT (to be implemented)
  }

  return { paymentRequests, booking, message: socialConstants.SUCCESS_MESSAGES[4] }; // BILL_SPLIT_COMPLETED
}

module.exports = {
  invitePartyMember,
  updatePartyMemberStatus,
  removePartyMember,
  splitBill,
};