// walletService.js
// Manages merchant wallet creation, payments, payouts, balance, and transaction history.
// Last Updated: July 14, 2025

'use strict';

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const merchantWalletConstants = require('@constants/merchant/merchantWalletConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const munchConstants = require('@constants/common/munchConstants');
const { Wallet, WalletTransaction, Merchant, Staff, Customer, User } = require('@models');

async function createMerchantWallet(merchantId) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const existingWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (existingWallet) throw new Error('Merchant wallet already exists');

    const currency = munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[merchant.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY;
    if (!munchConstants.MUNCH_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error('Unsupported currency');
    }

    const wallet = await Wallet.create({
      user_id: merchant.user_id,
      merchant_id: merchantId,
      balance: 0.00,
      currency,
      type: merchantWalletConstants.WALLET_CONSTANTS.WALLET_TYPE,
    });

    return wallet;
  } catch (error) {
    logger.error('Error creating merchant wallet', { error: error.message });
    throw error;
  }
}

async function receivePayment(merchantId, amount, walletId) {
  try {
    if (!merchantId || !amount || !walletId) throw new Error('Merchant ID, amount, and wallet ID required');
    if (amount <= 0) throw new Error('Amount must be positive');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const merchantWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!merchantWallet) throw new Error('Merchant wallet not found');

    const customerWallet = await Wallet.findByPk(walletId, { include: [{ model: Customer, as: 'customer' }] });
    if (!customerWallet || customerWallet.type !== 'customer') throw new Error('Invalid customer wallet');
    if (customerWallet.balance < amount) throw new Error(merchantWalletConstants.WALLET_CONSTANTS.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS);

    const transaction = await sequelize.transaction(async (t) => {
      await customerWallet.update({ balance: customerWallet.balance - amount }, { transaction: t });
      await merchantWallet.update({ balance: merchantWallet.balance + amount }, { transaction: t });

      const tx = await WalletTransaction.create(
        {
          wallet_id: merchantWallet.id,
          type: munchConstants.ORDER_CONSTANTS.ORDER_TYPES.includes('delivery') ? merchantWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.order_payment : 'payment',
          amount,
          currency: merchantWallet.currency,
          status: merchantWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
          description: `Payment from customer wallet ${walletId}`,
        },
        { transaction: t }
      );

      await WalletTransaction.create(
        {
          wallet_id: customerWallet.id,
          type: merchantWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.order_payment,
          amount: -amount,
          currency: customerWallet.currency,
          status: merchantWalletConstants.WALLET_CONSTANTS.PAYMENT_STATUSES.completed,
          description: `Payment to merchant ${merchantId}`,
        },
        { transaction: t }
      );

      return tx;
    });

    return transaction;
  } catch (error) {
    logger.error('Error receiving payment', { error: error.message });
    throw error;
  }
}

async function disbursePayout(merchantId, recipientId, amount) {
  try {
    if (!merchantId || !recipientId || !amount) throw new Error('Merchant ID, recipient ID, and amount required');
    if (amount <= 0) throw new Error('Amount must be positive');

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
          description: `Payout to staff ${recipientId}`,
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
    logger.error('Error disbursing payout', { error: error.message });
    throw error;
  }
}

async function getWalletBalance(merchantId) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    return { balance: wallet.balance, currency: wallet.currency };
  } catch (error) {
    logger.error('Error retrieving wallet balance', { error: error.message });
    throw error;
  }
}

async function getTransactionHistory(merchantId) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: wallet.id },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    return transactions;
  } catch (error) {
    logger.error('Error retrieving transaction history', { error: error.message });
    throw error;
  }
}

module.exports = {
  createMerchantWallet,
  receivePayment,
  disbursePayout,
  getWalletBalance,
  getTransactionHistory,
};