// financialAnalyticsService.js
// Provides financial analytics and reporting for merchants.
// Last Updated: July 14, 2025

'use strict';

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const merchantWalletConstants = require('@constants/merchant/merchantWalletConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Merchant, Payment, Wallet, WalletTransaction, TaxRecord } = require('@models');

async function getFinancialSummary(merchantId, period) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');
    if (!mtablesConstants.ANALYTICS_PERIODS.includes(period)) {
      throw new Error('Invalid analytics period');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: { [Op.in]: merchantWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES },
        created_at: {
          [Op.gte]: new Date(Date.now() - (period === 'DAILY' ? 24 * 60 * 60 * 1000 : period === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000 : period === 'MONTHLY' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)),
        },
      },
    });

    const payments = await Payment.findAll({
      where: {
        merchant_id: merchantId,
        status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('delivered') ? 'completed' : 'pending',
        created_at: {
          [Op.gte]: new Date(Date.now() - (period === 'DAILY' ? 24 * 60 * 60 * 1000 : period === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000 : period === 'MONTHLY' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)),
        },
      },
    });

    const taxRecords = await TaxRecord.findAll({
      where: {
        merchant_id: merchantId,
        period: mtablesConstants.ANALYTICS_PERIODS.includes(period) ? period : 'MONTHLY',
      },
    });

    const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const taxes = taxRecords.reduce((sum, record) => sum + record.amount, 0);
    const payouts = transactions.filter((tx) => tx.type === merchantWalletConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.payout).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
      revenue,
      taxes,
      payouts,
      balance: wallet.balance,
      currency: wallet.currency,
      period,
    };
  } catch (error) {
    logger.error('Error retrieving financial summary', { error: error.message });
    throw error;
  }
}

async function getRevenueTrends(merchantId, period) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');
    if (!mtablesConstants.ANALYTICS_PERIODS.includes(period)) {
      throw new Error('Invalid analytics period');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const payments = await Payment.findAll({
      where: {
        merchant_id: merchantId,
        status: 'completed',
        created_at: {
          [Op.gte]: new Date(Date.now() - (period === 'DAILY' ? 24 * 60 * 60 * 1000 : period === 'WEEKLY' ? 7 * 24 * 60 * 60 * 1000 : period === 'MONTHLY' ? 30 * 24 * 60 * 60 * 1000 : 365 * 24 * 60 * 60 * 1000)),
        },
      },
      order: [['created_at', 'ASC']],
    });

    const trends = payments.reduce((acc, payment) => {
      const date = new Date(payment.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + payment.amount;
      return acc;
    }, {});

    return { trends, currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[merchant.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY };
  } catch (error) {
    logger.error('Error retrieving revenue trends', { error: error.message });
    throw error;
  }
}

module.exports = {
  getFinancialSummary,
  getRevenueTrends,
};