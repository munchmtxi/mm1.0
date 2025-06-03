'use strict';

/**
 * paymentService.js
 * Handles payment processing for munch staff. Includes salary, bonus, withdrawal processing,
 * audit logging, and error handling.
 * Last Updated: May 26, 2025
 */

const { Payment, Wallet, WalletTransaction, AuditLog, SupportTicket, Staff, Tip } = require('@models');
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
 * Executes salary payments to staff wallet.
 * @param {number} staffId - Staff ID.
 * @param {number} amount - Payment amount.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Payment record.
 */
async function processSalaryPayment(staffId, amount, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const payment = await Payment.create({
      staff_id: staffId,
      amount,
      payment_method: 'wallet_transfer',
      status: 'completed',
      merchant_id: staff.merchant_id,
      currency: staff.wallet.currency,
    });

    await Wallet.update(
      { balance: sequelize.literal(`balance + ${amount}`) },
      { where: { id: staff.wallet.id } }
    );

    await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: merchantConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.SALARY,
      amount,
      currency: staff.wallet.currency,
      status: 'completed',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, paymentId: payment.id, action: 'salary_payment' },
      ipAddress,
    });

    const message = localization.formatMessage('payment.salary_processed', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:salary_processed', { staffId, amount, paymentId: payment.id });

    return payment;
  } catch (error) {
    logger.error('Salary payment processing failed', { error: error.message, staffId, amount });
    throw new AppError(`Salary payment failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Disburses bonuses to staff wallet.
 * @param {number} staffId - Staff ID.
 * @param {number} amount - Bonus amount.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Payment record.
 */
async function processBonusPayment(staffId, amount, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const payment = await Payment.create({
      staff_id: staffId,
      amount,
      payment_method: 'wallet_transfer',
      status: 'completed',
      merchant_id: staff.merchant_id,
      currency: staff.wallet.currency,
    });

    await Wallet.update(
      { balance: sequelize.literal(`balance + ${amount}`) },
      { where: { id: staff.wallet.id } }
    );

    await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: merchantConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.BONUS,
      amount,
      currency: staff.wallet.currency,
      status: 'completed',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, paymentId: payment.id, action: 'bonus_payment' },
      ipAddress,
    });

    const message = localization.formatMessage('payment.bonus_processed', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:bonus_processed', { staffId, amount, paymentId: payment.id });

    return payment;
  } catch (error) {
    logger.error('Bonus payment processing failed', { error: error.message, staffId, amount });
    throw new AppError(`Bonus payment failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Processes approved withdrawals.
 * @param {number} staffId - Staff ID.
 * @param {number} amount - Withdrawal amount.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Payout record.
 */
async function confirmWithdrawal(staffId, amount, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (amount > staff.wallet.balance) {
      throw new AppError('Insufficient balance', 400, staffConstants.STAFF_ERROR_CODES.INSUFFICIENT_BALANCE);
    }

    await securityService.verifyMFA(staff.user_id);

    const payout = await Payout.create({
      wallet_id: staff.wallet.id,
      staff_id: staffId,
      amount,
      currency: staff.wallet.currency,
      method: 'bank_transfer',
      status: 'completed',
    });

    await Wallet.update(
      { balance: sequelize.literal(`balance - ${amount}`) },
      { where: { id: staff.wallet.id } }
    );

    await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: merchantConstants.WALLET_CONSTANTS.TRANSACTION_TYPES.WITHDRAWAL,
      amount,
      currency: staff.wallet.currency,
      status: 'completed',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, payoutId: payout.id, action: 'confirm_withdrawal' },
      ipAddress,
    });

    const message = localization.formatMessage('payment.withdrawal_confirmed', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:withdrawal_confirmed', { staffId, amount, payoutId: payout.id });

    return payout;
  } catch (error) {
    logger.error('Withdrawal confirmation failed', { error: error.message, staffId, amount });
    throw new AppError(`Withdrawal confirmation failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Records payment transactions for audit.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Array>} Audit logs.
 */
async function logPaymentAudit(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const logs = await AuditLog.findAll({
      where: { user_id: staffId, 'details.action': { [Op.in]: ['salary_payment', 'bonus_payment', 'confirm_withdrawal'] } },
      order: [['created_at', 'DESC']],
      limit: 100,
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:audit_logged', { staffId, logs });

    return logs;
  } catch (error) {
    logger.error('Payment audit logging failed', { error: error.message, staffId });
    throw new AppError(`Audit logging failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Resolves payment errors by creating support tickets.
 * @param {number} staffId - Staff ID.
 * @param {Object} errorDetails - Error details (paymentId, description).
 * @returns {Promise<Object>} Support ticket record.
 */
async function handlePaymentErrors(staffId, errorDetails) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const ticket = await SupportTicket.create({
      user_id: staff.user_id,
      service_type: 'munch',
      issue_type: 'PAYMENT_ISSUE',
      description: errorDetails.description,
      status: 'open',
      priority: 'high',
      ticket_number: `TCKT-${Date.now()}`,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, ticketId: ticket.id, action: 'handle_payment_error' },
    });

    const message = localization.formatMessage('payment.error_reported', { ticketId: ticket.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      message,
      role: 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:error_reported', { staffId, ticketId: ticket.id });

    return ticket;
  } catch (error) {
    logger.error('Payment error handling failed', { error: error.message, staffId });
    throw new AppError(`Error handling failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  processSalaryPayment,
  processBonusPayment,
  confirmWithdrawal,
  logPaymentAudit,
  handlePaymentErrors,
};