'use strict';

const PaymentSecurityService = require('@services/merchant/security/paymentSecurityService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const tokenizePaymentsController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const payment = req.body;
  const ipAddress = req.ip || '0.0.0.0';
  const result = await PaymentSecurityService.tokenizePayments(merchantId, payment);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: result.action,
    details: { transactionId: result.transactionId, amount: payment.amount, currency: payment.currency },
    ipAddress,
  });

  const message = formatMessage(req.user.preferred_language, 'paymentSecurity.paymentTokenized', {
    amount: payment.amount,
    currency: payment.currency,
  });
  await notificationService.createNotification({
    userId: merchantId,
    type: 'PROMOTION',
    message,
    priority: 'HIGH',
    languageCode: req.user.preferred_language,
    transactionId: result.transactionId,
  });

  await socketService.emit(null, `payment:tokenized:${merchantId}`, result);

  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find(a => a.action === result.action);
  const pointsRecord = await gamificationService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: result.action,
    languageCode: req.user.preferred_language,
    multipliers: { dataFields: 1 },
  });

  await notificationService.createNotification({
    userId: merchantId,
    type: 'PROMOTION',
    message: formatMessage(req.user.preferred_language, 'paymentSecurity.pointsAwarded', {
      points: pointsRecord.points,
      action: actionConfig.name,
    }),
    priority: 'LOW',
    languageCode: req.user.preferred_language,
  });

  res.status(200).json({
    status: 'success',
    message,
    data: result,
  });
});

const enforceMFAController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip || '0.0.0.0';
  const result = await PaymentSecurityService.enforceMFA(merchantId);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: result.action,
    details: { merchantId, mfaMethod: result.mfaMethod },
    ipAddress,
  });

  const message = formatMessage(req.user.preferred_language, 'paymentSecurity.mfaEnforced', {
    method: result.mfaMethod,
  });
  await notificationService.createNotification({
    userId: merchantId,
    type: 'PROMOTION',
    message,
    priority: 'HIGH',
    languageCode: req.user.preferred_language,
  });

  await socketService.emit(null, `mfa:enforced:${merchantId}`, result);

  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find(a => a.action === result.action);
  const pointsRecord = await gamificationService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: result.action,
    languageCode: req.user.preferred_language,
    multipliers: { complianceStatus: 1 },
  });

  await notificationService.createNotification({
    userId: merchantId,
    type: 'PROMOTION',
    message: formatMessage(req.user.preferred_language, 'paymentSecurity.pointsAwarded', {
      points: pointsRecord.points,
      action: actionConfig.name,
    }),
    priority: 'LOW',
    languageCode: req.user.preferred_language,
  });

  res.status(200).json({
    status: 'success',
    message,
    data: result,
  });
});

const monitorFraudController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip || '0.0.0.0';
  const result = await PaymentSecurityService.monitorFraud(merchantId);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: result.action,
    details: { merchantId, suspiciousCount: result.suspiciousCount },
    ipAddress,
  });

  const message = formatMessage(req.user.preferred_language, 'paymentSecurity.fraudDetected', {
    count: result.suspiciousCount,
  });
  if (result.suspiciousCount > 0) {
    await notificationService.createNotification({
      userId: merchantId,
      type: 'PROMOTION',
      message,
      priority: 'CRITICAL',
      languageCode: req.user.preferred_language,
    });
  }

  await socketService.emit(null, `fraud:detected:${merchantId}`, result);

  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find(a => a.action === result.action);
  const pointsRecord = await gamificationService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: result.action,
    languageCode: req.user.preferred_language,
    multipliers: { complianceStatus: result.suspiciousCount > 0 ? 1 : 0 },
  });

  await notificationService.createNotification({
    userId: merchantId,
    type: 'PROMOTION',
    message: formatMessage(req.user.preferred_language, 'paymentSecurity.pointsAwarded', {
      points: pointsRecord.points,
      action: actionConfig.name,
    }),
    priority: 'LOW',
    languageCode: req.user.preferred_language,
  });

  res.status(200).json({
    status: 'success',
    message,
    data: result,
  });
});

const trackSecurityGamificationController = catchAsync(async (req, res) => {
  const { customerId } = req.params;
  const ipAddress = req.ip || '0.0.0.0';
  const result = await PaymentSecurityService.trackSecurityGamification(customerId);

  await auditService.logAction({
    userId: customerId,
    role: 'customer',
    action: result.action,
    details: { customerId, paymentCount: result.paymentCount },
    ipAddress,
  });

  const actionConfig = gamificationConstants.CUSTOMER_ACTIONS.find(a => a.action === result.action);
  const pointsRecord = await gamificationService.awardPoints({
    userId: customerId,
    role: 'customer',
    action: result.action,
    languageCode: req.user.preferred_language,
  });

  const message = formatMessage(req.user.preferred_language, 'paymentSecurity.pointsAwarded', {
    points: pointsRecord.points,
    action: actionConfig.name || 'Payment Completed',
  });
  await notificationService.createNotification({
    userId: customerId,
    type: 'PROMOTION',
    message,
    priority: 'LOW',
    languageCode: req.user.preferred_language,
  });

  await socketService.emit(null, `security:gamification:${customerId}`, result);

  res.status(200).json({
    status: 'success',
    message,
    data: result,
  });
});

module.exports = {
  tokenizePaymentsController,
  enforceMFAController,
  monitorFraudController,
  trackSecurityGamificationController,
};