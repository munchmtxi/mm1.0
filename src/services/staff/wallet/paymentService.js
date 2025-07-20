'use strict';

const { Payment, Wallet, Staff, Payout } = require('@models');
const staffWalletConstants = require('@constants/staff/staffWalletConstants');
const tipConstants = require('@constants/common/tipConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Processes salary payment into a staff member's wallet
 */
async function processSalaryPayment(staffId, amount, securityService) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  // Verify MFA
  await securityService.verifyMFA(staff.user_id);

  // Validate currency
  const currency = localizationConstants.SUPPORTED_CURRENCIES.includes(staff.wallet.currency)
    ? staff.wallet.currency
    : localizationConstants.DEFAULT_CURRENCY;

  const payment = await Payment.create({
    staff_id: staffId,
    amount,
    payment_method: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0], // bank_transfer
    status: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
    merchant_id: staff.merchant_id,
    currency,
  });

  // Update wallet balance
  await Wallet.update(
    { balance: staff.wallet.balance + amount },
    { where: { id: staff.wallet.id } }
  );

  return payment;
}

/**
 * Processes bonus payment into a staff member's wallet
 */
async function processBonusPayment(staffId, amount, securityService) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  await securityService.verifyMFA(staff.user_id);

  const currency = staff.wallet.currency;

  const payment = await Payment.create({
    staff_id: staffId,
    amount,
    payment_method: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0],
    status: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1],
    merchant_id: staff.merchant_id,
    currency,
  });

  await Wallet.update(
    { balance: staff.wallet.balance + amount },
    { where: { id: staff.wallet.id } }
  );

  return payment;
}

/**
 * Confirms a withdrawal request from a staff wallet
 */
async function confirmWithdrawal(staffId, amount, securityService) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  await securityService.verifyMFA(staff.user_id);

  if (amount > staff.wallet.balance) {
    throw new AppError('Insufficient funds', 400);
  }

  const minPayout = staffWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MIN_PAYOUT_AMOUNT;
  const maxPayout = staffWalletConstants.WALLET_CONSTANTS.WALLET_SETTINGS.MAX_PAYOUT_AMOUNT;

  if (amount < minPayout || amount > maxPayout) {
    throw new AppError(`Amount must be between ${minPayout} and ${maxPayout}`, 400);
  }

  const payout = await Payout.create({
    wallet_id: staff.wallet.id,
    staff_id: staffId,
    amount,
    currency: staff.wallet.currency,
    method: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_METHODS[0],
    status: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1],
  });

  await Wallet.update(
    { balance: staff.wallet.balance - amount },
    { where: { id: staff.wallet.id } }
  );

  return payout;
}

module.exports = {
  processSalaryPayment,
  processBonusPayment,
  confirmWithdrawal,
};