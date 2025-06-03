'use strict';

/**
 * dataProtectionService.js
 * Manages data encryption, GDPR/CCPA compliance, access control, and security gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const crypto = require('crypto');
const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Merchant, Customer, Staff, Driver, DataAccess, GamificationPoints, AuditLog, Notification } = require('@models');

/**
 * Encrypts sensitive customer, staff, or driver data.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} data - Data to encrypt (userId, role, sensitiveData).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Encryption result.
 */
async function encryptData(merchantId, data, io) {
  try {
    if (!merchantId || !data?.userId || !data?.role || !data?.sensitiveData) {
      throw new Error('Merchant ID, user ID, role, and sensitive data required');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validRoles = ['customer', 'staff', 'driver'];
    if (!validRoles.includes(data.role)) throw new Error('Invalid role');

    const Model = data.role === 'customer' ? Customer : data.role === 'staff' ? Staff : Driver;
    const entity = await Model.findByPk(data.userId);
    if (!entity) throw new Error(`${data.role} not found`);

    const algorithm = merchantConstants.SECURITY_CONSTANTS.ENCRYPTION_ALGORITHM;
    const key = crypto.randomBytes(32); // In production, use secure key management
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data.sensitiveData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    await entity.update({
      personal_data: {
        ...entity.personal_data,
        encrypted: { data: encrypted, iv: iv.toString('hex'), key: key.toString('hex') }, // Store securely in production
      },
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'encrypt_data',
      details: { merchantId, userId: data.userId, role: data.role },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'dataProtection:encrypted', {
      merchantId,
      userId: data.userId,
      role: data.role,
    }, `merchant:${merchantId}`);

    return { encrypted, userId: data.userId, role: data.role };
  } catch (error) {
    logger.error('Error encrypting data', { error: error.message });
    throw error;
  }
}

/**
 * Ensures GDPR/CCPA compliance for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Compliance status.
 */
async function enforceGDPR(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const complianceChecks = {
      hasDataProtectionPolicy: !!merchant.business_type_details?.dataProtectionPolicy,
      dataEncrypted: (await Customer.findAll({ where: { merchant_id: merchantId } }))
        .every(c => c.personal_data?.encrypted),
      consentObtained: (await Customer.findAll({ where: { merchant_id: merchantId } }))
        .every(c => c.personal_data?.consent),
      dataRetentionCompliant: true, // Placeholder for retention policy check
    };

    const isCompliant = Object.values(complianceChecks).every(check => check);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'enforce_gdpr',
      details: { merchantId, isCompliant, complianceChecks },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'dataProtection:gdprEnforced', {
      merchantId,
      isCompliant,
    }, `merchant:${merchantId}`);

    if (!isCompliant) {
      await notificationService.sendNotification({
        userId: merchant.user_id,
        notificationType: 'gdpr_compliance_issue',
        messageKey: 'dataProtection.gdpr_compliance_issue',
        messageParams: {},
        role: 'merchant',
        module: 'dataProtection',
        languageCode: merchant.preferred_language || 'en',
      });
    }

    return { isCompliant, complianceChecks };
  } catch (error) {
    logger.error('Error enforcing GDPR', { error: error.message });
    throw error;
  }
}

/**
 * Controls data access permissions for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} accessData - Access settings (userId, role, resource, permissions).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated access record.
 */
async function manageDataAccess(merchantId, accessData, io) {
  try {
    if (!merchantId || !accessData?.userId || !accessData?.role || !accessData?.resource || !accessData?.permissions) {
      throw new Error('Merchant ID, user ID, role, resource, and permissions required');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validRoles = ['customer', 'staff', 'driver'];
    if (!validRoles.includes(accessData.role)) throw new Error('Invalid role');

    const validPermissions = merchantConstants.SECURITY_CONSTANTS.PERMISSION_LEVELS;
    if (!accessData.permissions.every(p => Object.values(validPermissions).includes(p))) {
      throw new Error('Invalid permissions');
    }

    const [accessRecord, created] = await DataAccess.upsert({
      user_id: accessData.userId,
      role: accessData.role,
      merchant_id: merchantId,
      resource: accessData.resource,
      permissions: accessData.permissions,
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'manage_data_access',
      details: { merchantId, accessData },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'dataProtection:accessManaged', {
      merchantId,
      userId: accessData.userId,
      resource: accessData.resource,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: accessData.userId,
      notificationType: 'data_access_updated',
      messageKey: 'dataProtection.data_access_updated',
      messageParams: { resource: accessData.resource },
      role: accessData.role,
      module: 'dataProtection',
      languageCode: merchant.preferred_language || 'en',
    });

    return accessRecord;
  } catch (error) {
    logger.error('Error managing data access', { error: error.message });
    throw error;
  }
}

/**
 * Awards privacy points for customer security actions.
 * @param {number} customerId - Customer ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackSecurityGamification(customerId, io) {
  try {
    if (!customerId) throw new Error('Customer ID required');

    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new Error('Customer not found');

    const points = await pointService.awardPoints({
      userId: customer.user_id,
      role: 'customer',
      action: 'security_features',
      languageCode: customer.preferred_language || 'en',
    });

    await auditService.logAction({
      userId: customer.user_id,
      role: 'customer',
      action: 'track_security_gamification',
      details: { customerId, points: points.points },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'dataProtection:securityPointsAwarded', {
      customerId,
      points: points.points,
    }, `customer:${customerId}`);

    await notificationService.sendNotification({
      userId: customer.user_id,
      notificationType: 'security_points_awarded',
      messageKey: 'dataProtection.security_points_awarded',
      messageParams: { points: points.points },
      role: 'customer',
      module: 'dataProtection',
      languageCode: customer.preferred_language || 'en',
    });

    return points;
  } catch (error) {
    logger.error('Error tracking security gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  encryptData,
  enforceGDPR,
  manageDataAccess,
  trackSecurityGamification,
};