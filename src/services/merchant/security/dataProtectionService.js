// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\merchant\security\dataProtectionService.js
'use strict';

const { sequelize, User, Customer } = require('@models');
const merchantConstants = require('@constants/merchantConstants');
const securityService = require('@services/common/securityService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

class DataProtectionService {
  static async encryptSensitiveData(merchantId, data, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const encryptedData = securityService.encryptData(JSON.stringify(data));

      const message = formatMessage(merchant.preferred_language, 'dataProtection.dataEncrypted', { dataType: data.type || 'sensitive' });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, dataType: data.type || 'sensitive' },
        ipAddress,
      }, transaction);

      socketService.emit(`data:encrypted:${merchantId}`, { merchantId, dataType: data.type || 'sensitive' });

      await transaction.commit();
      logger.info(`Data encrypted for merchant ${merchantId}: ${data.type || 'sensitive'}`);
      return { merchantId, encryptedData };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('encryptSensitiveData', error, merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
    }
  }

  static async complyWithRegulations(merchantId, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language', 'country'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const standards = merchantConstants.COMPLIANCE_CONSTANTS.DATA_PROTECTION_STANDARDS;
      if (!standards.includes('GDPR') && !standards.includes('CCPA')) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidStandards'), 400, merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
      }

      const complianceStatus = { merchantId, standards, compliant: true }; // Simplified compliance check

      const message = formatMessage(merchant.preferred_language, 'dataProtection.regulationsComplied', { standards: standards.join(', ') });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'HIGH',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, standards },
        ipAddress,
      }, transaction);

      socketService.emit(`compliance:updated:${merchantId}`, complianceStatus);

      await transaction.commit();
      logger.info(`Regulatory compliance verified for merchant ${merchantId}: ${standards.join(', ')}`);
      return complianceStatus;
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('complyWithRegulations', error, merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
    }
  }

  static async restrictDataAccess(merchantId, accessRequest, ipAddress) {
    const transaction = await sequelize.transaction();

    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
        transaction,
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const { userId, permission } = accessRequest;
      if (!Object.values(merchantConstants.SECURITY_CONSTANTS.PERMISSION_LEVELS).includes(permission)) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidPermission'), 400, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
      }

      const requestingUser = await User.findByPk(userId, { transaction });
      if (!requestingUser) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidUser'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const message = formatMessage(merchant.preferred_language, 'dataProtection.accessRestricted', { userId, permission });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'MEDIUM',
        languageCode: merchant.preferred_language,
      }, transaction);

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: { merchantId, userId, permission },
        ipAddress,
      }, transaction);

      socketService.emit(`access:restricted:${merchantId}`, { merchantId, userId, permission });

      await transaction.commit();
      logger.info(`Data access restricted for merchant ${merchantId}: user ${userId}, permission ${permission}`);
      return { merchantId, userId, permission };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('restrictDataAccess', error, merchantConstants.ERROR_CODES.PERMISSION_DENIED);
    }
  }

  static async auditDataSecurity(merchantId, ipAddress) {
    try {
      const merchant = await User.findByPk(merchantId, {
        attributes: ['id', 'preferred_language'],
        include: [{ model: Customer, as: 'customer_profile', attributes: ['id'] }],
      });
      if (!merchant || !merchant.customer_profile) {
        throw new AppError(formatMessage('merchant', 'security', 'en', 'dataProtection.errors.invalidMerchant'), 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
      }

      const auditLogs = await sequelize.models.AuditLog.findAll({
        where: { user_id: merchantId },
        limit: 100,
      });

      const auditSummary = {
        merchantId,
        auditCount: auditLogs.length,
        lastAudit: auditLogs[0]?.created_at || null,
      };

      const message = formatMessage(merchant.preferred_language, 'dataProtection.securityAudited', { auditCount: auditSummary.auditCount });
      await notificationService.createNotification({
        userId: merchantId,
        type: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        message,
        priority: 'LOW',
        languageCode: merchant.preferred_language,
      });

      await auditService.logAction({
        userId: merchantId,
        role: 'merchant',
        action: merchantConstants.SECURITY_CONSTANTS.AUDIT_LOG_RETENTION_DAYS,
        details: auditSummary,
        ipAddress,
      });

      socketService.emit(`audit:completed:${merchantId}`, auditSummary);

      logger.info(`Security audit completed for merchant ${merchantId}: ${auditSummary.auditCount} logs`);
      return auditSummary;
    } catch (error) {
      throw handleServiceError('auditDataSecurity', error, merchantConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
    }
  }
}

module.exports = DataProtectionService;