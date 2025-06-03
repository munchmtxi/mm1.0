// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\merchant\security\paymentSecurityService.js
'use strict';

const { sequelize, User, Wallet, WalletTransaction, Payment, Customer } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const munchConstants = require('@constants/munchConstants');
const securityService = require('@services/common/securityService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentSecurityService {
  static async tokenizePayments(merchantId, payment, ipAddress) {
    const { amount, currency, paymentMethod } = payment;
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      if (!munchConstants.PAYMENT_CONSTANTS.PAYMENT_METHODS[paymentMethod.toUpperCase()]) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.invalidPaymentMethod'), 400, munchConstants.ERROR_CODES.INVALID_PAYMENT_METHOD);
      }

      if (!merchantConstants.BRANCH_SETTINGS.SUPPORTED_CURRENCIES.includes(currency)) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.invalidCurrency'), 400, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
      }

      const wallet = await Wallet.findOne({ where: { merchant_id: merchantId }, transaction });
      if (!wallet) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.walletNotFound'), 404, munchConstants.ERROR_CODES.WALLET_NOT_FOUND);
      }

      const tokenized = await stripe.paymentMethods.create({
        type: paymentMethod.toLowerCase(),
        card: { token: payment.cardToken }, // Assumes cardToken is provided
      });

      const transactionRecord = await WalletTransaction.create({
        wallet_id: wallet.id,
        type: munchConstants.PAYMENT_CONSTANTS.TRANSACTION_TYPES.PAYMENT,
        amount,
        currency,
        status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES.COMPLETED,
        payment_method_id: tokenized.id,
        description: `Tokenized payment for merchant ${merchantId}`,
      }, { transaction });

      const message = formatMessage(merchant.preferred_language, 'paymentSecurity.paymentTokenized', { amount, currency });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
        transactionId: transactionRecord.id,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { transactionId: transactionRecord.id, amount, currency },
        ipAddress,
      }, transaction);

      socketService.emit(`payment:tokenized:${merchantId}`, { transactionId: transactionRecord.id, merchantId });

      await transaction.commit();
      logger.info(`Payment tokenized for merchant ${merchantId}: ${amount} ${currency}`);
      return { transactionId: transactionRecord.id };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('tokenizePayments', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }

  static async enforceMFA(merchantId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language', 'mfa_status', 'mfa_method'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      if (merchant.mfa_status === merchantConstants.SECURITY_CONSTANTS.MFA_STATUSES.ENABLED) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.mfaAlreadyEnabled'), 400, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
      }

      const mfaMethod = merchantConstants.SECURITY_CONSTANTS.MFA_METHODS.SMS; // Default to SMS
      const mfaToken = await securityService.generateMFAToken(merchantId, mfaMethod);

      await merchant.update({
        mfa_status: merchantConstants.SECURITY_CONSTANTS.MFA_STATUSES.PENDING,
        mfa_method: mfaMethod,
      }, { transaction });

      const message = formatMessage(merchant.preferred_language, 'paymentSecurity.mfaEnforced', { method: mfaMethod });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
        tokenId: mfaToken.id,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, mfaMethod },
        ipAddress,
      }, transaction);

      socketService.emit(`mfa:enforced:${merchantId}`, { merchantId, mfaMethod });

      await transaction.commit();
      logger.info(`MFA enforced for merchant ${merchantId} with method ${mfaMethod}`);
      return { merchantId, mfaMethod };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('enforceMFA', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }

  static async monitorFraud(merchantId, ipAddress) {
    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const transactions = await WalletTransaction.findAll({
        where: { wallet_id: (await Wallet.findOne({ where: { merchant_id: merchantId } })).id },
        include: [{ model: Wallet, as: 'wallet' }],
      });

      const riskThreshold = munchConstants.PAYMENT_CONSTANTS.SECURITY_SETTINGS.ANOMALY_RISK_THRESHOLD;
      const suspicious = transactions.filter(t => {
        const riskScore = t.amount > munchConstants.PAYMENT_CONSTANTS.FINANCIAL_LIMITS.PAYMENT.MAX_AMOUNT ? 0.9 : 0.1;
        return riskScore > riskThreshold;
      });

      if (suspicious.length > 0) {
        const message = formatMessage(merchant.preferred_language, 'paymentSecurity.fraudDetected', { count: suspicious.length });
        await notificationService.createNotification({
          userId: merchantId,
          type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          message,
          priority: 'CRITICAL',
          languageCode: merchant.preferred_language,
        });

        socketService.emit(`fraud:detected:${merchantId}`, { merchantId, suspiciousCount: suspicious.length });
      }

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, suspiciousCount: suspicious.length },
        ipAddress,
      });

      logger.info(`Fraud monitoring for merchant ${merchantId}: ${suspicious.length} suspicious transactions`);
      return { merchantId, suspiciousCount: suspicious.length };
    } catch (error) {
      throw handleServiceError('monitorFraud', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }

  static async trackSecurityGamification(customerId, ipAddress) {
    try {
      const customer = await User.findByPk(customerId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!customer || !customer.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'paymentSecurity.errors.invalidCustomer'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const payments = await Payment.findAll({
        where: { customer_id: customerId, status: munchConstants.PAYMENT_CONSTANTS.PAYMENT_STATUSES.COMPLETED },
      });

      const points = payments.length * merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PAYMENT_STREAK.points;

      await gamificationService.awardPoints({
        userId: customerId,
        action: merchantConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.PAYMENT_STREAK.action,
        points,
        metadata: { paymentCount: payments.length },
      });

      const message = formatMessage(customer.preferred_language, 'paymentSecurity.pointsAwarded', { points });
      await notificationService.createNotification({
        userId: customerId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'LOW',
        languageCode: customer.preferred_language,
      });

      await auditService.logAction({
        userId: customerId,
        role: 'customer',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { customerId, pointsAwarded: points, paymentCount: payments.length },
        ipAddress,
      });

      socketService.emit(`security:gamification:${customerId}`, { customerId, points });

      logger.info(`Security gamification tracked for customer ${customerId}: ${points} points`);
      return { customerId, points };
    } catch (error) {
      throw handleServiceError('trackSecurityGamification', error, merchantConstants.ERROR_CODES.PAYMENT_FAILED);
    }
  }
}

module.exports = PaymentSecurityService;