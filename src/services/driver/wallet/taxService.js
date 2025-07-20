'use strict';

const { Driver, Wallet, WalletTransaction, TaxRecord, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const taxConstants = require('@constants/taxConstants');
const payoutConstants = require('@constants/driver/payoutConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { handleServiceError } = require('@utils/errorHandling');
const { roundToDecimal } = require('@utils/mathUtils');
const { subtractDaysFromDate, getStartOfDay } = require('@utils/dateTimeUtils');
const logger = require('@utils/logger');
const { Op } = require('sequelize');
const { Parser } = require('json2csv');

async function calculateTax(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_TYPES.WALLET_TYPES.DRIVER },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, taxConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const dateFilter = {};
  const now = new Date();
  if (period === 'monthly') dateFilter[Op.gte] = subtractDaysFromDate(now, 30);
  else if (period === 'quarterly') dateFilter[Op.gte] = subtractDaysFromDate(now, 90);
  else if (period === 'yearly') dateFilter[Op.gte] = subtractDaysFromDate(now, 365);

  const transaction = await sequelize.transaction();
  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.EARNING,
        created_at: dateFilter,
      },
      transaction,
    });

    const taxableAmount = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const country = driver.country || 'US';
    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[country]?.VAT || taxConstants.DEFAULT_TAX_RATE;
    const taxAmount = roundToDecimal(taxableAmount * taxRate, 2);

    const taxRecord = await TaxRecord.create({
      driver_id: driverId,
      period,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      currency,
      country,
    }, { transaction });

    await transaction.commit();
    logger.info('Tax calculated', { driverId, period, taxAmount, currency });
    return { driverId, period, taxableAmount, taxAmount, currency };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('calculateTax', error, taxConstants.ERROR_CODES.TAX_CALCULATION_FAILED);
  }
}

async function generateTaxReport(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const taxRecords = await TaxRecord.findAll({
      where: { driver_id: driverId, period },
      order: [['created_at', 'DESC']],
      transaction,
    });

    const report = {
      driverId,
      period,
      currency,
      records: taxRecords.map(r => ({
        taxableAmount: roundToDecimal(parseFloat(r.taxable_amount), 2),
        taxAmount: roundToDecimal(parseFloat(r.tax_amount), 2),
        currency: r.currency,
        country: r.country,
        created_at: r.created_at,
      })),
    };

    await transaction.commit();
    logger.info('Tax report generated', { driverId, period, currency });
    return report;
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('generateTaxReport', error, taxConstants.ERROR_CODES.TAX_REPORT_FAILED);
  }
}

async function updateTaxSettings(driverId, settings, currency = localizationConstants.DEFAULT_CURRENCY) {
  const { filingFrequency, country } = settings;
  if (!taxConstants.SUPPORTED_FILING_FREQUENCIES.includes(filingFrequency)) {
    throw new AppError('Invalid filing frequency', 400, taxConstants.ERROR_CODES.INVALID_FILING_FREQUENCY);
  }
  if (country && !Object.keys(payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES).includes(country)) {
    throw new AppError('Invalid country', 400, taxConstants.ERROR_CODES.INVALID_COUNTRY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    await Driver.update({ country }, { where: { id: driverId }, transaction });
    await transaction.commit();
    logger.info('Tax settings updated', { driverId, filingFrequency, country, currency });
    return { driverId, filingFrequency, country, currency };
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('updateTaxSettings', error, taxConstants.ERROR_CODES.TAX_SETTINGS_FAILED);
  }
}

async function exportTaxData(driverId, format, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!['csv', 'json'].includes(format)) {
    throw new AppError('Invalid format', 400, taxConstants.ERROR_CODES.INVALID_FORMAT);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const transaction = await sequelize.transaction();
  try {
    const taxRecords = await TaxRecord.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
      transaction,
    });

    const data = taxRecords.map(r => ({
      period: r.period,
      taxableAmount: roundToDecimal(parseFloat(r.taxable_amount), 2),
      taxAmount: roundToDecimal(parseFloat(r.tax_amount), 2),
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

    await transaction.commit();
    logger.info('Tax data exported', { driverId, format, currency });
    return result;
  } catch (error) {
    await transaction.rollback();
    throw handleServiceError('exportTaxData', error, taxConstants.ERROR_CODES.TAX_EXPORT_FAILED);
  }
}

async function estimateFutureTax(driverId, period, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_TYPES.WALLET_TYPES.DRIVER },
  });
  if (!wallet) {
    throw new AppError('Wallet not found', 404, taxConstants.ERROR_CODES.WALLET_NOT_FOUND);
  }

  const dateFilter = period === 'monthly' ? subtractDaysFromDate(new Date(), 30) :
                    period === 'quarterly' ? subtractDaysFromDate(new Date(), 90) :
                    subtractDaysFromDate(new Date(), 365);

  try {
    const transactions = await WalletTransaction.findAll({
      where: {
        wallet_id: wallet.id,
        type: paymentConstants.TRANSACTION_TYPES.EARNING,
        created_at: { [Op.gte]: dateFilter },
      },
    });

    const totalEarnings = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const avgDailyEarnings = totalEarnings / (period === 'monthly' ? 30 : period === 'quarterly' ? 90 : 365);
    const forecastEarnings = period === 'monthly' ? avgDailyEarnings * 30 :
                            period === 'quarterly' ? avgDailyEarnings * 90 : avgDailyEarnings * 365;
    const taxRate = payoutConstants.DRIVER_REVENUE_SETTINGS.TAX_RATES[driver.country || 'US']?.VAT || taxConstants.DEFAULT_TAX_RATE;
    const estimatedTax = roundToDecimal(forecastEarnings * taxRate, 2);

    logger.info('Future tax estimated', { driverId, period, estimatedTax, currency });
    return { driverId, period, forecastEarnings: roundToDecimal(forecastEarnings, 2), estimatedTax, currency };
  } catch (error) {
    throw handleServiceError('estimateFutureTax', error, taxConstants.ERROR_CODES.TAX_CALCULATION_FAILED);
  }
}

async function getTaxComplianceStatus(driverId, currency = localizationConstants.DEFAULT_CURRENCY) {
  if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
    throw new AppError('Invalid currency', 400, paymentConstants.ERROR_CODES.INVALID_CURRENCY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
  }

  try {
    const taxRecords = await TaxRecord.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
    });

    const filingFrequency = taxConstants.SUPPORTED_FILING_FREQUENCIES.includes(driver.filing_frequency)
      ? driver.filing_frequency
      : 'quarterly';
    const requiredRecords = filingFrequency === 'monthly' ? 1 : filingFrequency === 'quarterly' ? 4 : 12;
    const complianceStatus = taxRecords.length >= requiredRecords ? 'compliant' : 'non_compliant';

    logger.info('Tax compliance status retrieved', { driverId, complianceStatus, currency });
    return { driverId, complianceStatus, recordCount: taxRecords.length, requiredRecords, currency };
  } catch (error) {
    throw handleServiceError('getTaxComplianceStatus', error, taxConstants.ERROR_CODES.TAX_REPORT_FAILED);
  }
}

module.exports = {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  exportTaxData,
  estimateFutureTax,
  getTaxComplianceStatus,
};