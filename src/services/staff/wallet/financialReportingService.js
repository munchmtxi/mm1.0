'use strict';

/**
 * financialReportingService.js
 * Generates financial reports for munch staff. Handles payment reports, wallet activity,
 * data exports, tax compliance, and audit trails.
 * Last Updated: May 26, 2025
 */

const { Report, Payment, WalletTransaction, TaxRecord, AuditLog, Staff, FinancialSummary } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Creates salary/bonus payment reports.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Report record.
 */
async function generatePaymentReport(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const payments = await Payment.findAll({
      where: { staff_id: staffId, payment_method: 'wallet_transfer' },
      limit: 100,
    });

    const reportData = {
      total_salary: payments.filter(p => p.type === 'salary').reduce((sum, p) => sum + p.amount, 0),
      total_bonus: payments.filter(p => p.type === 'bonus').reduce((sum, p) => sum + p.amount, 0),
      transactions: payments.map(p => ({ id: p.id, amount: p.amount, type: p.type, created_at: p.created_at })),
    };

    const report = await Report.create({
      report_type: 'payment_summary',
      data: reportData,
      generated_by: staff.user_id,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, reportId: report.id, action: 'generate_payment_report' },
    });

    const message = localization.formatMessage('reporting.payment_report_generated', { reportId: report.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.REPORT_GENERATED,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:payment_report_generated', { staffId, reportId: report.id });

    return report;
  } catch (error) {
    logger.error('Payment report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Summarizes wallet transactions.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Summary data.
 */
async function summarizeWalletActivity(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: staff.wallet.id },
      limit: 100,
    });

    const summary = {
      total_deposits: transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0),
      total_withdrawals: transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0),
      total_rewards: transactions.filter(t => t.type === 'reward').reduce((sum, t) => sum + t.amount, 0),
      transaction_count: transactions.length,
    };

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:wallet_summary', { staffId, summary });

    return summary;
  } catch (error) {
    logger.error('Wallet activity summary failed', { error: error.message, staffId });
    throw new AppError(`Summary failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Exports financial data for audits.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Exported data.
 */
async function exportFinancialData(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: staff.wallet.id },
    });

    const exportData = {
      wallet_id: staff.wallet.id,
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        created_at: t.created_at,
      })),
    };

    const encryptedData = await securityService.encryptData(exportData);

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:data_exported', { staffId });

    return encryptedData;
  } catch (error) {
    logger.error('Financial data export failed', { error: error.message, staffId });
    throw new AppError(`Data export failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Records tax-related data.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Tax record.
 */
async function trackTaxCompliance(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const transactions = await WalletTransaction.findAll({
      where: { wallet_id: staff.wallet.id, type: { [Op.in]: ['salary', 'bonus', 'reward'] } },
    });

    const taxableAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const taxAmount = taxableAmount * merchantConstants.WALLET_CONSTANTS.TAX_RATE;

    const taxRecord = await TaxRecord.create({
      staff_id: staffId,
      period: 'monthly',
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      currency: staff.wallet.currency,
      country: 'US',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, taxRecordId: taxRecord.id, action: 'track_tax_compliance' },
    });

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:tax_tracked', { staffId, taxRecordId: taxRecord.id });

    return taxRecord;
  } catch (error) {
    logger.error('Tax compliance tracking failed', { error: error.message, staffId });
    throw new AppError(`Tax tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Generates audit trails for financial transactions.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Array>} Audit logs.
 */
async function auditFinancialTransactions(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const logs = await AuditLog.findAll({
      where: { user_id: staffId, 'details.action': { [Op.in]: ['salary_payment', 'bonus_payment', 'confirm_withdrawal', 'convert_points', 'redeem_reward'] } },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:audit_trail', { staffId, logs });

    return logs;
  } catch (error) {
    logger.error('Financial audit trail failed', { error: error.message, staffId });
    throw new AppError(`Audit trail failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  generatePaymentReport,
  summarizeWalletActivity,
  exportFinancialData,
  trackTaxCompliance,
  auditFinancialTransactions,
};