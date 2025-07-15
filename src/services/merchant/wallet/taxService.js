// taxService.js
// Manages tax calculations, reporting, settings, and compliance.
// Last Updated: July 14, 2025

'use strict';

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const taxConstants = require('@constants/common/taxConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const munchConstants = require('@constants/common/munchConstants');
const { Merchant, MerchantBranch, Payment, TaxRecord, Wallet, WalletTransaction } = require('@models');

async function calculateTax(merchantId, amount, countryCode) {
  try {
    if (!merchantId || !amount || !countryCode) throw new Error('Merchant ID, amount, and country code required');
    if (amount <= 0) throw new Error('Amount must be positive');

    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: MerchantBranch, as: 'branches' }] });
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    if (!munchConstants.MUNCH_SETTINGS.SUPPORTED_COUNTRIES.includes(countryCode)) {
      throw new Error('Unsupported country');
    }

    const taxRate = taxConstants.TAX_RATES[countryCode]?.VAT || taxConstants.TAX_RATES[countryCode]?.SALES_TAX || 0;
    if (!taxRate) throw new Error(taxConstants.ERROR_CODES.INVALID_TAX_RATE);

    const taxAmount = amount * taxRate;
    const taxRecord = await TaxRecord.create({
      merchant_id: merchantId,
      amount: taxAmount,
      tax_type: taxConstants.TAX_SETTINGS.DEFAULT_TAX_TYPE,
      calculation_method: taxConstants.TAX_SETTINGS.TAX_CALCULATION_METHODS[0],
      currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[countryCode] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
      period: taxConstants.TAX_SETTINGS.TAX_REPORT_PERIODS[0],
    });

    return { taxAmount, taxRecord };
  } catch (error) {
    logger.error('Error calculating tax', { error: error.message });
    throw error;
  }
}

async function generateTaxReport(merchantId, period) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');
    if (!taxConstants.TAX_SETTINGS.TAX_REPORT_PERIODS.includes(period)) {
      throw new Error(taxConstants.ERROR_CODES.INVALID_TAX_TYPE);
    }

    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: MerchantBranch, as: 'branches' }] });
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const taxRecords = await TaxRecord.findAll({
      where: { merchant_id: merchantId, period },
      order: [['created_at', 'DESC']],
    });

    const totalTax = taxRecords.reduce((sum, record) => sum + record.amount, 0);
    return { taxRecords, totalTax, currency: munchConstants.MUNCH_SETTINGS.COUNTRY_CURRENCY_MAP[merchant.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY };
  } catch (error) {
    logger.error('Error generating tax report', { error: error.message });
    throw error;
  }
}

async function applyTaxExemption(merchantId, exemptStatus) {
  try {
    if (!merchantId || !exemptStatus) throw new Error('Merchant ID and exempt status required');
    if (!taxConstants.TAX_SETTINGS.TAX_EXEMPT_STATUSES.includes(exemptStatus)) {
      throw new Error(taxConstants.ERROR_CODES.INVALID_EXEMPT_STATUS);
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    await merchant.update({ tax_exempt_status: exemptStatus });
    return { message: taxConstants.SUCCESS_MESSAGES[2], exemptStatus };
  } catch (error) {
    logger.error('Error applying tax exemption', { error: error.message });
    throw error;
  }
}

module.exports = {
  calculateTax,
  generateTaxReport,
  applyTaxExemption,
};