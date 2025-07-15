'use strict';

const { Report, Payment, WalletTransaction, TaxRecord, AuditLog, Staff, FinancialSummary } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function generatePaymentReport(staffId, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const payments = await Payment.findAll({
      where: { 
        staff_id: staffId, 
        payment_method: paymentConstants.PAYMENT_METHODS.includes('bank_transfer') ? 'bank_transfer' : 'wallet_transfer' 
      },
      limit: 100,
    });

    const reportData = {
      total_salary: payments
        .filter(p => paymentConstants.TRANSACTION_TYPES.includes(p.type) && p.type === 'salary')
        .reduce((sum, p) => sum + p.amount, 0),
      total_bonus: payments
        .filter(p => paymentConstants.TRANSACTION_TYPES.includes(p.type) && p.type === 'bonus')
        .reduce((sum, p) => sum + p.amount, 0),
      transactions: payments.map(p => ({ 
        id: p.id, 
        amount: p.amount, 
        type: p.type || 'payment', 
        created_at: p.created_at 
      })),
    };

    const report = await Report.create({
      report_type: 'payment_summary',
      data: reportData,
      generated_by: staff.user_id,
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, reportId: report.id, action: 'generate_payment_report' },
    });

    const message = formatMessage('reporting.payment_report_generated', { reportId: report.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:payment_report_generated', { staffId, reportId: report.id });

    return report;
  } catch (error) {
    logger.error('Payment report generation failed', { error: error.message, staffId });
    throw new AppError(`Report generation failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function summarizeWalletActivity(staffId, socketService) {
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
      total_deposits: transactions
        .filter(t => paymentConstants.TRANSACTION_TYPES.includes(t.type) && t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0),
      total_withdrawals: transactions
        .filter(t => paymentConstants.TRANSACTION_TYPES.includes(t.type) && t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0),
      total_rewards: transactions
        .filter(t => paymentConstants.TRANSACTION_TYPES.includes(t.type) && t.type === 'gamification_reward')
        .reduce((sum, t) => sum + t.amount, 0),
      transaction_count: transactions.length,
    };

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:wallet_summary', { staffId, summary });

    return summary;
  } catch (error) {
    logger.error('Wallet activity summary failed', { error: error.message, staffId });
    throw new AppError(`Summary failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('WALLET_NOT_FOUND') ? 'WALLET_NOT_FOUND' : 'TRANSACTION_FAILED');
  }
}

async function exportFinancialData(staffId, securityService, socketService) {
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
        type: paymentConstants.TRANSACTION_TYPES.includes(t.type) ? t.type : 'payment',
        amount: t.amount,
        currency: t.currency,
        status: paymentConstants.TRANSACTION_STATUSES.includes(t.status) ? t.status : 'completed',
        created_at: t.created_at,
      })),
    };

    const encryptedData = await securityService.encryptData(exportData);

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:data_exported', { staffId });

    return encryptedData;
  } catch (error) {
    logger.error('Financial data export failed', { error: error.message, staffId });
    throw new AppError(`Data export failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'WALLET_NOT_FOUND');
  }
}

async function trackTaxCompliance(staffId, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const transactions = await WalletTransaction.findAll({
      where: { 
        wallet_id: staff.wallet.id, 
        type: { [Op.in]: ['salary', 'bonus', 'gamification_reward'].filter(t => paymentConstants.TRANSACTION_TYPES.includes(t)) } 
      },
    });

    const taxableAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const taxAmount = taxableAmount * 0.15; // Fixed tax rate (replace with config if needed)

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
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, taxRecordId: taxRecord.id, action: 'track_tax_compliance' },
    });

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:tax_tracked', { staffId, taxRecordId: taxRecord.id });

    return taxRecord;
  } catch (error) {
    logger.error('Tax compliance tracking failed', { error: error.message, staffId });
    throw new AppError(`Tax tracking failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'WALLET_NOT_FOUND');
  }
}

async function auditFinancialTransactions(staffId, socketService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const logs = await AuditLog.findAll({
      where: { 
        user_id: staffId, 
        'details.action': { [Op.in]: ['salary_payment', 'bonus_payment', 'confirm_withdrawal'].filter(a => a) } 
      },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    socketService.emit(`munch:reporting:${staffId}`, 'reporting:audit_trail', { staffId, logs });

    return logs;
  } catch (error) {
    logger.error('Financial audit trail failed', { error: error.message, staffId });
    throw new AppError(`Audit trail failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'WALLET_NOT_FOUND');
  }
}

module.exports = {
  generatePaymentReport,
  summarizeWalletActivity,
  exportFinancialData,
  trackTaxCompliance,
  auditFinancialTransactions
};