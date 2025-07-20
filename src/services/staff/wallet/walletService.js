'use strict';

const { Wallet, Staff, Tip, Shift } = require('@models');
const staffWalletConstants = require('@constants/staff/staffWalletConstants');
const tipConstants = require('@constants/common/tipConstants');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Retrieves current wallet balance for a staff member
 */
async function getWalletBalance(staffId, securityService) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  await securityService.verifyMFA(staff.user_id);

  return {
    balance: staff.wallet.balance,
    currency: staff.wallet.currency,
  };
}

/**
 * Retrieves transaction history for a staff's wallet
 */
async function viewTransactionHistory(staffId) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  const transactions = await staff.wallet.getTransactions({
    order: [['created_at', 'DESC']],
    limit: 100,
  });

  return transactions;
}

/**
 * Requests a withdrawal from staff wallet (pending status)
 */
async function requestWithdrawal(staffId, amount, securityService) {
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
    status: staffWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[0], // pending
  });

  return payout;
}

/**
 * Syncs wallet with merchant account
 */
async function syncWithMerchant(staffId, merchantId) {
  const staff = await Staff.findByPk(staffId, {
    include: [{ model: Wallet, as: 'wallet' }],
  });

  if (!staff || !staff.wallet) {
    throw new AppError('Staff or wallet not found', 404);
  }

  if (staff.merchant_id !== merchantId) {
    throw new AppError('Staff not associated with this merchant', 403);
  }

  await Wallet.update(
    { merchant_id: merchantId },
    { where: { id: staff.wallet.id } }
  );

  return { success: true, message: 'Wallet synced with merchant' };
}

/**
 * Auto-distribute tips across active shifts
 */
async function distributeTipsToShifts(staffId, totalTipAmount) {
  const staff = await Staff.findByPk(staffId, {
    include: [
      { model: Wallet, as: 'wallet' },
      { model: Shift, as: 'shifts', where: { status: 'active' } }
    ],
  });

  if (!staff || !staff.wallet || staff.shifts.length === 0) {
    throw new AppError('No active shifts or wallet found', 400);
  }

  const shiftCount = staff.shifts.length;
  const perShiftAmount = totalTipAmount / shiftCount;

  for (const shift of staff.shifts) {
    await Tip.create({
      recipient_id: staffId,
      customer_id: null, // assumed system-generated tip
      amount: perShiftAmount,
      currency: staff.wallet.currency,
      status: tipConstants.TIP_SETTINGS.TIP_STATUSES[1], // completed
      wallet_id: staff.wallet.id,
    });

    await Wallet.update(
      { balance: staff.wallet.balance + perShiftAmount },
      { where: { id: staff.wallet.id } }
    );
  }

  return { distributed: true, total: totalTipAmount, perShift: perShiftAmount };
}

module.exports = {
  getWalletBalance,
  viewTransactionHistory,
  requestWithdrawal,
  syncWithMerchant,
  distributeTipsToShifts,
};