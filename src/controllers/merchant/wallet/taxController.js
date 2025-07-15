// taxController.js
// Handles tax-related requests for merchants, integrating with services and emitting events/notifications.

'use strict';

const { formatMessage } = require('@utils/localization');
const taxService = require('@services/merchant/wallet/taxService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { Merchant } = require('@models');

async function calculateTax(req, res, next) {
  try {
    const { merchantId, period } = req.body;
    const io = req.app.get('io');

    const taxDetails = await taxService.calculateTax(merchantId, period);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'calculate_tax',
      details: { merchantId, period, taxDetails },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'calculate_tax',
      points: 10,
      details: { merchantId, period, taxObligation: taxDetails.taxObligation },
    });

    socketService.emit(io, 'merchant:tax:calculated', {
      merchantId,
      period,
      taxObligation: taxDetails.taxObligation,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'tax_calculated',
      messageKey: 'tax.calculated',
      messageParams: { period, amount: taxDetails.taxObligation, currency: taxDetails.currency },
      role: 'merchant',
      module: 'tax',
      languageCode: merchant.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('tax.calculated', { period, amount: taxDetails.taxObligation, currency: taxDetails.currency }, merchant.preferred_language || 'en'),
      data: taxDetails,
    });
  } catch (error) {
    next(error);
  }
}

async function generateTaxReport(req, res, next) {
  try {
    const { merchantId, period } = req.body;
    const io = req.app.get('io');

    const report = await taxService.generateTaxReport(merchantId, period);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'generate_tax_report',
      details: { merchantId, period, report },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'generate_tax_report',
      points: 15,
      details: { merchantId, period, taxObligation: report.taxObligation },
    });

    socketService.emit(io, 'merchant:tax:reportGenerated', {
      merchantId,
      period,
      report,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'tax_report_generated',
      messageKey: 'tax.report_generated',
      messageParams: { period, amount: report.taxObligation, currency: report.currency },
      role: 'merchant',
      module: 'tax',
      languageCode: merchant.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('tax.report_generated', { period, amount: report.taxObligation, currency: report.currency }, merchant.preferred_language || 'en'),
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

async function updateTaxSettings(req, res, next) {
  try {
    const { merchantId, settings } = req.body;
    const io = req.app.get('io');

    const merchant = await taxService.updateTaxSettings(merchantId, settings);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'update_tax_settings',
      details: { merchantId, taxSettings: settings },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'update_tax_settings',
      points: 5,
      details: { merchantId, taxSettings: settings },
    });

    socketService.emit(io, 'merchant:tax:settingsUpdated', {
      merchantId,
      taxSettings: settings,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'tax_settings_updated',
      messageKey: 'tax.settings_updated',
      messageParams: { filingFrequency: settings.filingFrequency },
      role: 'merchant',
      module: 'tax',
      languageCode: merchant.preferred_language || 'en',
    });

    res.status(200).json({
      success: true,
      message: formatMessage('tax.settings_updated', { filingFrequency: settings.filingFrequency }, merchant.preferred_language || 'en'),
      data: merchant,
    });
  } catch (error) {
    next(error);
  }
}

async function ensureTaxCompliance(req, res, next) {
  try {
    const { merchantId } = req.body;
    const io = req.app.get('io');

    const compliance = await taxService.ensureTaxCompliance(merchantId);

    const merchant = await Merchant.findByPk(merchantId);
    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'ensure_tax_compliance',
      details: { merchantId, isCompliant: compliance.isCompliant, complianceChecks: compliance.complianceChecks },
      ipAddress: req.ip,
    });

    await pointService.awardPoints({
      userId: merchant.user_id,
      action: 'ensure_tax_compliance',
      points: compliance.isCompliant ? 10 : 0,
      details: { merchantId, isCompliant: compliance.isCompliant },
    });

    socketService.emit(io, 'merchant:tax:complianceChecked', {
      merchantId,
      isCompliant: compliance.isCompliant,
    }, `merchant:${merchantId}`);

    if (!compliance.isCompliant) {
      await notificationService.sendNotification({
        userId: merchant.user_id,
        notificationType: 'tax_compliance_issue',
        messageKey: 'tax.compliance_issue',
        messageParams: { country: compliance.country },
        role: 'merchant',
        module: 'tax',
        languageCode: merchant.preferred_language || 'en',
      });
    }

    res.status(200).json({
      success: true,
      message: formatMessage(compliance.isCompliant ? 'tax.compliance_verified' : 'tax.compliance_issue', { country: compliance.country }, merchant.preferred_language || 'en'),
      data: compliance,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  ensureTaxCompliance,
};