'use strict';

const paymentService = require('@services/staff/wallet/paymentService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function processSalaryPayment(req, res, next) {
  try {
    const { staffId, amount } = req.body;
    const ipAddress = req.ip;
    const payment = await paymentService.processSalaryPayment(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: payment,
      message: 'Salary payment processed successfully'
    });
  } catch (error) {
    logger.error('Salary payment processing failed', { error: error.message });
    next(error);
  }
}

async function processBonusPayment(req, res, next) {
  try {
    const { staffId, amount } = req.body;
    const ipAddress = req.ip;
    const payment = await paymentService.processBonusPayment(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: payment,
      message: 'Bonus payment processed successfully'
    });
  } catch (error) {
    logger.error('Bonus payment processing failed', { error: error.message });
    next(error);
  }
}

async function confirmWithdrawal(req, res, next) {
  try {
    const { staffId, amount } = req.body;
    const ipAddress = req.ip;
    const payout = await paymentService.confirmWithdrawal(staffId, amount, ipAddress, securityService, notificationService, auditService, socketService);
    return res.status(201).json({
      success: true,
      data: payout,
      message: 'Withdrawal confirmed successfully'
    });
  } catch (error) {
    logger.error('Withdrawal confirmation failed', { error: error.message });
    next(error);
  }
}

async function logPaymentAudit(req, res, next) {
  try {
    const { staffId } = req.params;
    const logs = await paymentService.logPaymentAudit(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: logs,
      message: 'Payment audit logs retrieved successfully'
    });
  } catch (error) {
    logger.error('Payment audit logging failed', { error: error.message });
    next(error);
  }
}

async function handlePaymentErrors(req, res, next) {
  try {
    const { staffId, errorDetails } = req.body;
    const ticket = await paymentService.handlePaymentErrors(staffId, errorDetails, auditService, notificationService, socketService);
    return res.status(201).json({
      success: true,
      data: ticket,
      message: 'Payment error reported successfully'
    });
  } catch (error) {
    logger.error('Payment error handling failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  processSalaryPayment,
  processBonusPayment,
  confirmWithdrawal,
  logPaymentAudit,
  handlePaymentErrors
};