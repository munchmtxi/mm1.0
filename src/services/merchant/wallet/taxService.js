'use strict';

/**
 * taxService.js
 * Manages tax calculations, reporting, settings, and compliance for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const { Op } = require('sequelize');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const taxConstants = require('@constants/common/taxConstants');
const { Wallet, WalletTransaction, Merchant, Order, AuditLog, Notification, Address } = require('@models');

/**
 * Computes tax obligations for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {string} period - Time period (monthly, quarterly, yearly).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Tax obligation details.
 */
async function calculateTax(merchantId, period, io) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');

    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: Address, as: 'addressRecord' }] });
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validPeriods = taxConstants.SUPPORTED_PERIODS;
    if (!validPeriods.includes(period)) throw new Error(taxConstants.ERROR_CODES.INVALID_PERIOD);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const country = merchant.addressRecord?.country || 'US'; // Default to US if address unavailable
    const taxRate = taxConstants.TAX_RATES[country]?.rate || taxConstants.DEFAULT_TAX_RATE;

    const startDate = new Date();
    if (period === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'quarterly') startDate.setMonth(startDate.getMonth() - 3);
    else startDate.setFullYear(startDate.getFullYear() - 1);

    const orders = await Order.findAll({
      where: {
        merchant_id: merchantId,
        created_at: { [Op.gte]: startDate },
        payment_status: 'paid',
      },
    });

    const taxableIncome = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const taxObligation = taxableIncome * (taxRate / 100);

    const taxDetails = {
      taxableIncome,
      taxObligation,
      taxRate,
      period,
      currency: wallet.currency,
      country,
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'calculate_tax',
      details: { merchantId, period, taxDetails },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'tax:calculated', {
      merchantId,
      period,
      taxObligation,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'tax_calculated',
      messageKey: 'tax.calculated',
      messageParams: { period, amount: taxObligation, currency: wallet.currency },
      role: 'merchant',
      module: 'tax',
      languageCode: merchant.preferred_language || 'en',
    });

    return taxDetails;
  } catch (error) {
    logger.error('Error calculating tax', { error: error.message });
    throw error;
  }
}

/**
 * Creates tax documentation for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {string} period - Time period (monthly, quarterly, yearly).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Tax report.
 */
async function generateTaxReport(merchantId, period, io) {
  try {
    if (!merchantId || !period) throw new Error('Merchant ID and period required');

    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: Address, as: 'addressRecord' }] });
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validPeriods = taxConstants.SUPPORTED_PERIODS;
    if (!validPeriods.includes(period)) throw new Error(taxConstants.ERROR_CODES.INVALID_PERIOD);

    const wallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!wallet) throw new Error('Merchant wallet not found');

    const country = merchant.addressRecord?.country || 'US';
    const taxRate = taxConstants.TAX_RATES[country]?.rate || taxConstants.DEFAULT_TAX_RATE;

    const startDate = new Date();
    if (period === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
    else if (period === 'quarterly') startDate.setMonth(startDate.getMonth() - 3);
    else startDate.setFullYear(startDate.getFullYear() - 1);

    const [orders, transactions] = await Promise.all([
      Order.findAll({
        where: {
          merchant_id: merchantId,
          created_at: { [Op.gte]: startDate },
          payment_status: 'paid',
        },
      }),
      WalletTransaction.findAll({
        where: {
          wallet_id: wallet.id,
          created_at: { [Op.gte]: startDate },
          type: 'PAYMENT',
        },
      }),
    ]);

    const taxableIncome = orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const taxObligation = taxableIncome * (taxRate / 100);

    const report = {
      merchantId,
      businessName: merchant.business_name,
      period,
      country,
      taxRate,
      taxableIncome,
      taxObligation,
      transactionCount: transactions.length,
      orderCount: orders.length,
      currency: wallet.currency,
      generatedAt: new Date(),
    };

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'generate_tax_report',
      details: { merchantId, period, report },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'tax:reportGenerated', {
      merchantId,
      period,
      report,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'tax_report_generated',
      messageKey: 'tax.report_generated',
      messageParams: { period, amount: taxObligation, currency: wallet.currency },
      role: 'merchant',
      module: 'tax',
      languageCode: merchant.preferred_language || 'en',
    });

    return report;
  } catch (error) {
    logger.error('Error generating tax report', { error: error.message });
    throw error;
  }
}

/**
 * Configures tax preferences for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} settings - Tax settings (taxId, exemptions, filingFrequency).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated merchant.
 */
async function updateTaxSettings(merchantId, settings, io) {
  try {
    if (!merchantId || !settings) throw new Error('Merchant ID and settings required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validFrequencies = taxConstants.SUPPORTED_FILING_FREQUENCIES;
    if (settings.filingFrequency && !validFrequencies.includes(settings.filingFrequency)) {
      throw new Error(taxConstants.ERROR_CODES.INVALID_FILING_FREQUENCY);
    }

    const taxSettings = {
      taxId: settings.taxId || merchant.business_type_details?.taxId,
      exemptions: settings.exemptions || merchant.business_type_details?.exemptions || [],
      filingFrequency: settings.filingFrequency || merchant.business_type_details?.filingFrequency || 'quarterly',
    };

    await merchant.update({
      business_type_details: {
        ...merchant.business_type_details,
        ...taxSettings,
      },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'update_tax_settings',
      details: { merchantId, taxSettings },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'tax:settingsUpdated', {
      merchantId,
      taxSettings,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'tax_settings_updated',
      messageKey: 'tax.settings_updated',
      messageParams: { filingFrequency: taxSettings.filingFrequency },
      role: 'merchant',
      module: 'tax',
      languageCode: merchant.preferred_language || 'en',
    });

    return merchant;
  } catch (error) {
    logger.error('Error updating tax settings', { error: error.message });
    throw error;
  }
}

/**
 * Verifies tax regulation adherence for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Compliance status.
 */
async function ensureTaxCompliance(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: Address, as: 'addressRecord' }] });
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const country = merchant.addressRecord?.country || 'US';
    const taxRequirements = taxConstants.TAX_RATES[country]?.requirements || [];

    const complianceChecks = {
      hasTaxId: !!merchant.business_type_details?.taxId,
      validFilingFrequency: taxConstants.SUPPORTED_FILING_FREQUENCIES.includes(
        merchant.business_type_details?.filingFrequency || 'quarterly'
      ),
      meetsCountryRequirements: taxRequirements.every(req => {
        if (req === 'tax_registration') return !!merchant.business_type_details?.taxId;
        if (req === 'annual_filing') return merchant.business_type_details?.filingFrequency !== 'none';
        return true;
      }),
    };

    const isCompliant = Object.values(complianceChecks).every(check => check);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'ensure_tax_compliance',
      details: { merchantId, isCompliant, complianceChecks },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'tax:complianceChecked', {
      merchantId,
      isCompliant,
    }, `merchant:${merchantId}`);

    if (!isCompliant) {
      await notificationService.sendNotification({
        userId: merchant.user_id,
        notificationType: 'tax_compliance_issue',
        messageKey: 'tax.compliance_issue',
        messageParams: { country },
        role: 'merchant',
        module: 'tax',
        languageCode: merchant.preferred_language || 'en',
      });
    }

    return { isCompliant, complianceChecks };
  } catch (error) {
    logger.error('Error ensuring tax compliance', { error: error.message });
    throw error;
  }
}

module.exports = {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  ensureTaxCompliance,
};