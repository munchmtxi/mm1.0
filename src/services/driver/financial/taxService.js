'use strict';

/**
 * Driver Tax Service
 * Manages driver tax operations, including calculating taxes,
 * generating reports, updating settings, and exporting data.
 */

const { Driver, WalletTransaction, TaxRecord, sequelize } = require('@models');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const driverConstants = require('@constants/driverConstants');
const taxConstants = require('@constants/taxConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');

/**
 * Calculates tax obligations for a driver.
 * @param {number} driverId - Driver ID.
 * @param {string} period - Tax period (monthly, quarterly, yearly).
 * @returns {Promise<Object>} Tax calculation details.
 */
async function calculateTax(driverId, period) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_SETTINGS.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, taxConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const dateFilter = {};
  const now = new Date();
  if (period === 'monthly') dateFilter[Op.gte] = new Date(now.setMonth(now.getMonth() - 1));
  else if (period === 'quarterly') dateFilter[Op.gte] = new Date(now.setMonth(now.getMonth() - 3));
  else if (period === 'yearly') dateFilter[Op.gte] = new Date(now.setFullYear(now.getFullYear() - 1));

  const transactions = await WalletTransaction.findAll({
    where: {
      wallet_id: wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.EARNING,
      created_at: dateFilter,
    },
  });

  const taxableAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const country = driver.country || 'US'; // Assume driver model has country or default to US
  const taxRate = taxConstants.TAX_RATES[country]?.rate || taxConstants.DEFAULT_TAX_RATE;
  const taxAmount = (taxableAmount * taxRate) / 100;

  const transaction = await sequelize.transaction();
  try {
    const taxRecord = await TaxRecord.create({
      driver_id: driverId,
      period,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      currency: wallet.currency,
      country,
    }, { transaction });

    await auditService.logAction({
      userId: driverId.toString(),
      role: 'driver',
      action: taxConstants.AUDIT_TYPES.CALCULATE_TAX,
      details: { driverId, period, taxableAmount, taxAmount },
      ipAddress: 'unknown',
    }, { transaction });

    await notificationService.sendNotification({
      userId: driver.user_id,
      notificationType: taxConstants.NOTIFICATION_TYPES.TAX_CALCULATED,
      message: formatMessage(
        'driver',
        'financial',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'tax.calculated',
        { period, taxAmount, currency: wallet.currency }
      ),
      priority: 'MEDIUM',
    }, { transaction });

    socketService.emitToUser(driver.user_id, taxConstants.EVENT_TYPES.TAX_CALCULATED, {
      driverId,
      period,
      taxAmount,
      taxableAmount,
    });

    await transaction.commit();
    logger.info('Tax calculated', { driverId, period, taxAmount });
    return { driverId, period, taxableAmount, taxAmount, currency: wallet.currency };
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Tax calculation failed: ${error.message}`, 500, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }
}

/**
 * Generates a tax report for a driver.
 * @param {number} driverId - Driver ID.
 * @param {string} period - Tax period (monthly, quarterly, yearly).
 * @returns {Promise<Object>} Tax report details.
 */
async function generateTaxReport(driverId, period) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const taxRecords = await TaxRecord.findAll({
    where: { driver_id: driverId, period },
    order: [['created_at', 'DESC']],
  });

  const report = {
    driverId,
    period,
    records: taxRecords.map(r => ({
      taxableAmount: parseFloat(r.taxable_amount),
      taxAmount: parseFloat(r.tax_amount),
      currency: r.currency,
      country: r.country,
      created_at: r.created_at,
    })),
  };

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: taxConstants.AUDIT_TYPES.GENERATE_TAX_REPORT,
    details: { driverId, period, recordCount: taxRecords.length },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    notificationType: taxConstants.NOTIFICATION_TYPES.TAX_REPORT_GENERATED,
    message: formatMessage(
      'driver',
      'financial',
      driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      'tax.report_generated',
      { period }
    ),
    priority: 'LOW',
  });

  socketService.emitToUser(driver.user_id, taxConstants.EVENT_TYPES.TAX_REPORT_GENERATED, { driverId, period });

  logger.info('Tax report generated', { driverId, period });
  return report;
}

/**
 * Updates tax settings for a driver.
 * @param {number} driverId - Driver ID.
 * @param {Object} settings - Tax settings (e.g., { filingFrequency: 'quarterly', country: 'US' }).
 * @returns {Promise<void>}
 */
async function updateTaxSettings(driverId, settings) {
  const { filingFrequency, country } = settings;
  if (!taxConstants.SUPPORTED_FILING_FREQUENCIES.includes(filingFrequency)) {
    throw new AppError('Invalid filing frequency', 400, taxConstants.ERROR_CODES.INVALID_FILING_FREQUENCY);
  }
  if (country && !Object.keys(taxConstants.TAX_RATES).includes(country)) {
    throw new AppError('Invalid country', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  // Simulate updating settings (e.g., in driver model or separate TaxSettings model)
  await Driver.update({ country }, { where: { id: driverId } }); // Update country if provided

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: taxConstants.AUDIT_TYPES.UPDATE_TAX_SETTINGS,
    details: { driverId, filingFrequency, country },
    ipAddress: 'unknown',
  });

  await notificationService.sendNotification({
    userId: driver.user_id,
    notificationType: taxConstants.NOTIFICATION_TYPES.TAX_SETTINGS_UPDATED,
    message: formatMessage(
      'driver',
      'financial',
      driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
      'tax.settings_updated',
      { filingFrequency }
    ),
    priority: 'LOW',
  });

  socketService.emitToUser(driver.user_id, taxConstants.EVENT_TYPES.TAX_SETTINGS_UPDATED, { driverId, filingFrequency });

  logger.info('Tax settings updated', { driverId, filingFrequency, country });
}

/**
 * Exports tax data in specified format.
 * @param {number} driverId - Driver ID.
 * @param {string} format - Export format (csv, json).
 * @returns {Promise<string>} Exported data.
 */
async function exportTaxData(driverId, format) {
  if (!['csv', 'json'].includes(format)) {
    throw new AppError('Invalid format', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const taxRecords = await TaxRecord.findAll({
    where: { driver_id: driverId },
    order: [['created_at', 'DESC']],
  });

  const data = taxRecords.map(r => ({
    period: r.period,
    taxableAmount: parseFloat(r.taxable_amount),
    taxAmount: parseFloat(r.tax_amount),
    currency: r.currency,
    country: r.country,
    created_at: r.created_at.toISOString(),
  }));

  let result;
  if (format === 'csv') {
    const fields = ['period', 'taxableAmount', 'taxAmount', 'currency', 'country', 'created_at'];
    const parser = new Parser({ fields });
    result = parser.parse(data);
  } else {
    result = JSON.stringify(data, null, 2);
  }

  await auditService.logAction({
    userId: driverId.toString(),
    role: 'driver',
    action: 'EXPORT_TAX_DATA',
    details: { driverId, format },
    ipAddress: 'unknown',
  });

  logger.info('Tax data exported', { driverId, format });
  return result;
}

module.exports = {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  exportTaxData,
};