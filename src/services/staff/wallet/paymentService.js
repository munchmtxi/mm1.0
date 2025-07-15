'use strict';

const { Payment, Wallet, WalletTransaction, AuditLog, SupportTicket, Staff } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const paymentConstants = require('@constants/common/paymentConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');
const { Op, fn, col } = require('sequelize');

async function processSalaryPayment(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const payment = await Payment.create({
      staff_id: staffId,
      amount,
      payment_method: paymentConstants.PAYMENT_METHODS.includes('bank_transfer') ? 'bank_transfer' : 'wallet_transfer',
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
      merchant_id: staff.merchant_id,
      currency: staff.wallet.currency,
    });

    await Wallet.update(
      { balance: fn('balance +', amount) },
      { where: { id: staff.wallet.id } }
    );

    await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.includes('salary') ? 'salary' : 'payment',
      amount,
      currency: staff.wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, paymentId: payment.id, action: 'salary_payment' },
      ipAddress,
    });

    const message = formatMessage('payment.salary_processed', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:salary_processed', { staffId, amount, paymentId: payment.id });

    return payment;
  } catch (error) {
    logger.error('Salary payment processing failed', { error: error.message, staffId, amount });
    throw new AppError(`Salary payment failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function processBonusPayment(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    await securityService.verifyMFA(staff.user_id);

    const payment = await Payment.create({
      staff_id: staffId,
      amount,
      payment_method: paymentConstants.PAYMENT_METHODS.includes('bank_transfer') ? 'bank_transfer' : 'wallet_transfer',
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
      merchant_id: staff.merchant_id,
      currency: staff.wallet.currency,
    });

    await Wallet.update(
      { balance: fn('balance +', amount) },
      { where: { id: staff.wallet.id } }
    );

    await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.includes('bonus') ? 'bonus' : 'payment',
      amount,
      currency: staff.wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, paymentId: payment.id, action: 'bonus_payment' },
      ipAddress,
    });

    const message = formatMessage('payment.bonus_processed', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:bonus_processed', { staffId, amount, paymentId: payment.id });

    return payment;
  } catch (error) {
    logger.error('Bonus payment processing failed', { error: error.message, staffId, amount });
    throw new AppError(`Bonus payment failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function confirmWithdrawal(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Wallet, as: 'wallet' }] });
    if (!staff || !staff.wallet) {
      throw new AppError('Wallet not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const withdrawalLimit = paymentConstants.FINANCIAL_LIMITS.find(limit => limit.type === 'WITHDRAWAL');
    if (amount > staff.wallet.balance) {
      throw new AppError('Insufficient balance', 400, paymentConstants.ERROR_CODES.includes('INSUFFICIENT_FUNDS') ? 'INSUFFICIENT_FUNDS' : 'INVALID_BALANCE');
    }
    if (amount < withdrawalLimit.min || amount > withdrawalLimit.max) {
      throw new Error(`Withdrawal amount must be between ${withdrawalLimit.min} and ${withdrawalLimit.max}`);
    }

    await securityService.verifyMFA(staff.user_id);

    const payout = await Payout.create({
      wallet_id: staff.wallet.id,
      staff_id: staffId,
      amount,
      currency: staff.wallet.currency,
      method: paymentConstants.PAYMENT_METHODS.includes('bank_transfer') ? 'bank_transfer' : 'default',
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
    });

    await Wallet.update(
      { balance: fn('balance -', amount) },
      { where: { id: staff.wallet.id } }
    );

    await WalletTransaction.create({
      wallet_id: staff.wallet.id,
      type: paymentConstants.TRANSACTION_TYPES.includes('withdrawal') ? 'withdrawal' : 'payment',
      amount,
      currency: staff.wallet.currency,
      status: paymentConstants.TRANSACTION_STATUSES[1], // 'completed'
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, amount, payoutId: payout.id, action: 'confirm_withdrawal' },
      ipAddress,
    });

    const message = formatMessage('payment.withdrawal_confirmed', { amount });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WITHDRAWAL_PROCESSED,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:withdrawal_confirmed', { staffId, amount, payoutId: payout.id });

    return payout;
  } catch (error) {
    logger.error('Withdrawal confirmation failed', { error: error.message, staffId, amount });
    throw new AppError(`Withdrawal confirmation failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function logPaymentAudit(staffId, socketService) {
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
    throw new AppError(`Audit logging failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

async function handlePaymentErrors(staffId, errorDetails, auditService, notificationService, socketService) {
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
      priority: paymentConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
      ticket_number: `TCKT-${Date.now()}`,
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, ticketId: ticket.id, action: 'handle_payment_error' },
    });

    const message = formatMessage('payment.error_reported', { ticketId: ticket.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: paymentConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PAYMENT_CONFIRMATION,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
    });

    socketService.emit(`munch:payment:${staffId}`, 'payment:error_reported', { staffId, ticketId: ticket.id });

    return ticket;
  } catch (error) {
    logger.error('Payment error handling failed', { error: error.message, staffId });
    throw new AppError(`Error handling failed: ${error.message}`, 500, paymentConstants.ERROR_CODES.includes('TRANSACTION_FAILED') ? 'TRANSACTION_FAILED' : 'INVALID_BALANCE');
  }
}

module.exports = {
  processSalaryPayment,
  processBonusPayment,
  confirmWithdrawal,
  logPaymentAudit,
  handlePaymentErrors
};