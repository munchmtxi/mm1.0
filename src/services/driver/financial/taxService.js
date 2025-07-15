'use strict';

const { Driver, Wallet, WalletTransaction, TaxRecord, sequelize } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const driverGamificationConstants = require('@constants/driver/driverGamificationConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const taxConstants = require('@constants/taxConstants');
const { formatMessage } = require('@utils/localization/localization');
const { Parser } = require('json2csv');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function calculateTax(driverId, period, { pointService, auditService, notificationService, socketService }) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_TYPES.DRIVER_NOT_FOUND);

  const wallet = await Wallet.findOne({
    where: { user_id: driver.user_id, type: paymentConstants.WALLET_TYPES.WALLET_TYPES.DRIVER },
  });
  if (!wallet) throw new AppError('Wallet not found', 404, taxConstants.ERROR_CODES.WALLET_NOT_FOUND);

  const dateFilter = {};
  const now = new Date();
  if (period === 'monthly') dateFilter[Op.gte] = new Date(now.setMonth(now.getMonth() - 1));
  else if (period === 'quarterly') dateFilter[Op.gte] = new Date(now.setMonth(now.getMonth() - 3));
  else if (period === 'yearly') dateFilter[Op.gte] = new Date(now.setFullYear(now.getFullYear() - 1));

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
    const taxRate = taxConstants.TAX_RATES[country]?.rate || taxConstants.DEFAULT_TAX_RATE;
    const taxAmount = (taxableAmount * taxRate) / 100;

    const taxRecord = await TaxRecord.create({
      driver_id: driverId,
      period,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      currency: wallet.currency,
      country,
    }, { transaction });

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: taxConstants.AUDIT_TYPES.CALCULATE_TAX,
        details: { driverId, period, taxableAmount, taxAmount },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'tax_calculation_access',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tax_calculation_access').points,
      { action: `Calculated tax for ${period}` },
      transaction
    );

    await notificationService.sendNotification(
      {
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
      },
      { transaction }
    );

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
    throw new AppError(`Tax calculation failed: ${error.message}`, 500, taxConstants.ERROR_CODES.TAX_CALCULATION_FAILED);
  }
}

async function generateTaxReport(driverId, period, { pointService, auditService, notificationService, socketService }) {
  if (!taxConstants.SUPPORTED_PERIODS.includes(period)) {
    throw new AppError('Invalid period', 400, taxConstants.ERROR_CODES.INVALID_PERIOD);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

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
      records: taxRecords.map(r => ({
        taxableAmount: parseFloat(r.taxable_amount),
        taxAmount: parseFloat(r.tax_amount),
        currency: r.currency,
        country: r.country,
        created_at: r.created_at,
      })),
    };

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: taxConstants.AUDIT_TYPES.GENERATE_TAX_REPORT,
        details: { driverId, period, recordCount: taxRecords.length },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const today = new Date().toISOString().split('T')[0];
    const existingPoints = await pointService.getPointsHistory(driverId, 'tax_report_access', {
      startDate: new Date(today),
      endDate: new Date(today + 'T23:59:59.999Z'),
    });
    if (!existingPoints.length) {
      await pointService.awardPoints(
        driverId,
        'tax_report_access',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tax_report_access').points,
        { action: `Generated tax report for ${period}` },
        transaction
      );
    }

    await notificationService.sendNotification(
      {
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
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, taxConstants.EVENT_TYPES.TAX_REPORT_GENERATED, { driverId, period });

    await transaction.commit();
    logger.info('Tax report generated', { driverId, period });
    return report;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Tax report generation failed: ${error.message}`, 500, taxConstants.ERROR_CODES.TAX_REPORT_FAILED);
  }
}

async function updateTaxSettings(driverId, settings, { pointService, auditService, notificationService, socketService }) {
  const { filingFrequency, country } = settings;
  if (!taxConstants.SUPPORTED_FILING_FREQUENCIES.includes(filingFrequency)) {
    throw new AppError('Invalid filing frequency', 400, taxConstants.ERROR_CODES.INVALID_FILING_FREQUENCY);
  }
  if (country && !Object.keys(taxConstants.TAX_RATES).includes(country)) {
    throw new AppError('Invalid country', 400, taxConstants.ERROR_CODES.INVALID_COUNTRY);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    await Driver.update({ country }, { where: { id: driverId }, transaction });

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: taxConstants.AUDIT_TYPES.UPDATE_TAX_SETTINGS,
        details: { driverId, filingFrequency, country },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    await pointService.awardPoints(
      driverId,
      'tax_settings_update',
      driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tax_settings_update').points,
      { action: `Updated tax settings to ${filingFrequency}` },
      transaction
    );

    await notificationService.sendNotification(
      {
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
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, taxConstants.EVENT_TYPES.TAX_SETTINGS_UPDATED, { driverId, filingFrequency });

    await transaction.commit();
    logger.info('Tax settings updated', { driverId, filingFrequency, country });
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Tax settings update failed: ${error.message}`, 500, taxConstants.ERROR_CODES.TAX_SETTINGS_FAILED);
  }
}

async function exportTaxData(driverId, format, { pointService, auditService, notificationService, socketService }) {
  if (!['csv', 'json'].includes(format)) {
    throw new AppError('Invalid format', 400, taxConstants.ERROR_CODES.INVALID_FORMAT);
  }

  const driver = await Driver.findByPk(driverId);
  if (!driver) throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);

  const transaction = await sequelize.transaction();
  try {
    const taxRecords = await TaxRecord.findAll({
      where: { driver_id: driverId },
      order: [['created_at', 'DESC']],
      transaction,
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

    await auditService.logAction(
      {
        userId: driverId.toString(),
        role: 'driver',
        action: taxConstants.AUDIT_TYPES.EXPORT_TAX_DATA,
        details: { driverId, format },
        ipAddress: 'unknown',
      },
      { transaction }
    );

    const today = new Date().toISOString().split('T')[0];
    const existingPoints = await pointService.getPointsHistory(driverId, 'tax_data_export', {
      startDate: new Date(today),
      endDate: new Date(today + 'T23:59:59.999Z'),
    });
    if (!existingPoints.length) {
      await pointService.awardPoints(
        driverId,
        'tax_data_export',
        driverGamificationConstants.GAMIFICATION_CONSTANTS.DRIVER_ACTIONS.find(a => a.action === 'tax_data_export').points,
        { action: `Exported tax data in ${format}` },
        transaction
      );
    }

    await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: taxConstants.NOTIFICATION_TYPES.TAX_REPORT_GENERATED,
        message: formatMessage(
          'driver',
          'financial',
          driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
          'tax.data_exported',
          { format }
        ),
        priority: 'LOW',
      },
      { transaction }
    );

    socketService.emitToUser(driver.user_id, taxConstants.EVENT_TYPES.TAX_DATA_EXPORTED, { driverId, format });

    await transaction.commit();
    logger.info('Tax data exported', { driverId, format });
    return result;
  } catch (error) {
    await transaction.rollback();
    throw new AppError(`Tax data export failed: ${error.message}`, 500, taxConstants.ERROR_CODES.TAX_EXPORT_FAILED);
  }
}

module.exports = {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  exportTaxData,
};