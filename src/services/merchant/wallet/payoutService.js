// payoutService.js
// Manages merchant payouts to staff and external accounts.
// Last Updated: July 14, 2025

'use strict';

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const merchantWalletConstants = require('@constants/merchant/merchantWalletConstants');
const staffWalletConstants = require('@constants/staff/staffWalletConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const munchConstants = require('@constants/common/munchConstants');
const { Merchant, Staff, Wallet, WalletTransaction, Tip } = require('@models');

async function processPayout(merchantId, recipientId, amount, payoutMethod) {
  try {
    if (!merchantId || !recipientId || !amount || !payoutMethod) throw new Error('Merchant ID, recipient ID, amount, and payout method required');
    if (amount <= 0) throw new Error('Amount must be positive');
    if (!mparkConstants.PAYMENT_CONFIG.PAYOUT_SETTINGS.SUPPORTED_PAYOUT_METHODS.includes(payoutMethod)) {
      throw new Error('Invalid payout method');
    }
    if (amount < mparkConstants.PAYMENT_CONFIG.PAYOUT_SETTINGS.MIN_PAYOUT_AMOUNT) {
      throw new Error('Amount below minimum payout');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const merchantWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!merchantWallet) throw new Error('Merchant wallet not found');
    if (merchantWallet.balance < amount) throw new Error(merchantWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);

    const recipient = await Staff.findByPk(recipientId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!recipient || !recipient.wallet) throw new Error('Invalid recipient or no wallet');

    const transaction = await sequelize.transaction(async (t) => {
      await merchantWallet.update({ balance: merchantWallet.balance - amount }, { transaction: t });
      await recipient.wallet.update({ balance: recipient.wallet.balance + amount }, { transaction: t });

      const tx = await WalletTransaction.create(
        {
          wallet_id: merchantWallet.id,
          type: merchantWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.payout,
          amount: -amount,
          currency: merchantWallet.currency,
          status: merchantWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
          description: `Payout to staff ${recipientId} via ${payoutMethod}`,
        },
        { transaction: t }
      );

      await WalletTransaction.create(
        {
          wallet_id: recipient.wallet.id,
          type: staffWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.salary_payment,
          amount,
          currency: recipient.wallet.currency,
          status: merchantWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
          description: `Payout from merchant ${merchantId}`,
        },
        { transaction: t }
      );

      return tx;
    });

    return transaction;
  } catch (error) {
    logger.error('Error processing payout', { error: error.message });
    throw error;
  }
}

async function distributeTips(merchantId, tips) {
  try {
    if (!merchantId || !Array.isArray(tips) || tips.length === 0) throw new Error('Merchant ID and tips array required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const merchantWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!merchantWallet) throw new Error('Merchant wallet not found');

    const totalTipAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
    if (merchantWallet.balance < totalTipAmount) throw new Error(merchantWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);

    const transactions = await sequelize.transaction(async (t) => {
      const txs = [];
      for (const tip of tips) {
        const { staffId, amount } = tip;
        if (amount <= 0) throw new Error('Tip amount must be positive');

        const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
        if (!staff || !staff.wallet) throw new Error('Invalid staff or no wallet');

        await merchantWallet.update({ balance: merchantWallet.balance - amount }, { transaction: t });
        await staff.wallet.update({ balance: staff.wallet.balance + amount }, { transaction: t });

        const tx = await WalletTransaction.create(
          {
            wallet_id: merchantWallet.id,
            type: merchantWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.tip,
            amount: -amount,
            currency: merchantWallet.currency,
            status: merchantWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
            description: `Tip to staff ${staffId}`,
          },
          { transaction: t }
        );

        await WalletTransaction.create(
          {
            wallet_id: staff.wallet.id,
            type: staffWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.tip,
            amount,
            currency: staff.wallet.currency,
            status: merchantWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
            description: `Tip from merchant ${merchantId}`,
          },
          { transaction: t }
        );

        await Tip.create(
          {
            merchant_id: merchantId,
            staff_id: staffId,
            amount,
            currency: merchantWallet.currency,
          },
          { transaction: t }
        );

        txs.push(tx);
      }
      return txs;
    });

    return transactions;
  } catch (error) {
    logger.error('Error distributing tips', { error: error.message });
    throw error;
  }
}

module.exports = {
  processPayout,
  distributeTips,
};