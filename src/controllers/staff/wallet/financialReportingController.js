'use strict';

const financialReportingService = require('@services/staff/wallet/financialReportingService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function generatePaymentReport(req, res, next) {
  try {
    const { staffId } = req.params;
    const report = await financialReportingService.generatePaymentReport(staffId, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: report,
      message: 'Payment report generated successfully'
    });
  } catch (error) {
    logger.error('Payment report generation failed', { error: error.message });
    next(error);
  }
}

async function summarizeWalletActivity(req, res, next) {
  try {
    const { staffId } = req.params;
    const summary = await financialReportingService.summarizeWalletActivity(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: summary,
      message: 'Wallet activity summarized successfully'
    });
  } catch (error) {
    logger.error('Wallet activity summary failed', { error: error.message });
    next(error);
  }
}

async function exportFinancialData(req, res, next) {
  try {
    const { staffId } = req.params;
    const encryptedData = await financialReportingService.exportFinancialData(staffId, securityService, socketService);
    return res.status(200).json({
      success: true,
      data: encryptedData,
      message: 'Financial data exported successfully'
    });
  } catch (error) {
    logger.error('Financial data export failed', { error: error.message });
    next(error);
  }
}

async function trackTaxCompliance(req, res, next) {
  try {
    const { staffId } = req.params;
    const taxRecord = await financialReportingService.trackTaxCompliance(staffId, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: taxRecord,
      message: 'Tax compliance tracked successfully'
    });
  } catch (error) {
    logger.error('Tax compliance tracking failed', { error: error.message });
    next(error);
  }
}

async function auditFinancialTransactions(req, res, next) {
  try {
    const { staffId } = req.params;
    const logs = await financialReportingService.auditFinancialTransactions(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: logs,
      message: 'Financial audit trail generated successfully'
    });
  } catch (error) {
    logger.error('Financial audit trail failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  generatePaymentReport,
  summarizeWalletActivity,
  exportFinancialData,
  trackTaxCompliance,
  auditFinancialTransactions
};