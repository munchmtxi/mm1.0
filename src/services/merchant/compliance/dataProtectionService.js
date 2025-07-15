'use strict';

const crypto = require('crypto');
const { Merchant, Customer, Staff, DataAccess } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const complianceConstants = require('@constants/common/complianceConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function encryptData(merchantId, data, ipAddress, transaction = null) {
  try {
    if (!merchantId || !data?.userId || !data?.role || !data?.sensitiveData) {
      throw new AppError('Invalid input data', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_INPUT);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, complianceConstants.COMPLIANCE_ERRORS.MERCHANT_NOT_FOUND);
    }

    const validRoles = ['customer', 'staff'];
    if (!validRoles.includes(data.role)) {
      throw new AppError('Invalid role', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_ROLE);
    }

    const Model = data.role === 'customer' ? Customer : Staff;
    const entity = await Model.findByPk(data.userId, { transaction });
    if (!entity) {
      throw new AppError(`${data.role} not found`, 404, complianceConstants.COMPLIANCE_ERRORS[`${data.role.toUpperCase()}_NOT_FOUND`]);
    }

    const algorithm = complianceConstants.ENCRYPTION_ALGORITHM;
    const key = crypto.randomBytes(32); // In production, use secure key management
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(data.sensitiveData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    await entity.update({
      preferences: {
        ...entity.preferences,
        encrypted: { data: encrypted, iv: iv.toString('hex'), key: key.toString('hex') }, // Store securely in production
      },
    }, { transaction });

    logger.info(`Data encrypted for ${data.role} ${data.userId} by merchant ${merchantId}`);
    return {
      merchantId,
      userId: data.userId,
      role: data.role,
      encrypted,
      language: merchant.preferred_language || 'en',
      action: 'dataEncrypted',
    };
  } catch (error) {
    throw handleServiceError('encryptData', error, complianceConstants.COMPLIANCE_ERRORS.SYSTEM_ERROR);
  }
}

async function enforceGDPR(merchantId, ipAddress, transaction = null) {
  try {
    if (!merchantId) {
      throw new AppError('Invalid merchant ID', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_MERCHANT_ID);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language', 'business_type_details'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, complianceConstants.COMPLIANCE_ERRORS.MERCHANT_NOT_FOUND);
    }

    const complianceChecks = {
      hasDataProtectionPolicy: !!merchant.business_type_details?.dataProtectionPolicy,
      dataEncrypted: (await Customer.findAll({ where: { merchant_id: merchantId }, transaction }))
        .every(c => c.preferences?.encrypted),
      consentObtained: (await Customer.findAll({ where: { merchant_id: merchantId }, transaction }))
        .every(c => c.preferences?.consent),
      dataRetentionCompliant: true, // Placeholder for retention policy check
    };

    const isCompliant = Object.values(complianceChecks).every(check => check);

    logger.info(`GDPR compliance checked for merchant ${merchantId}: ${isCompliant}`);
    return {
      merchantId,
      isCompliant,
      complianceChecks,
      language: merchant.preferred_language || 'en',
      action: 'gdprEnforced',
    };
  } catch (error) {
    throw handleServiceError('enforceGDPR', error, complianceConstants.COMPLIANCE_ERRORS.SYSTEM_ERROR);
  }
}

async function manageDataAccess(merchantId, accessData, ipAddress, transaction = null) {
  try {
    if (!merchantId || !accessData?.userId || !accessData?.role || !accessData?.resource || !accessData?.permissions) {
      throw new AppError('Invalid access data', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_ACCESS_DATA);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, complianceConstants.COMPLIANCE_ERRORS.MERCHANT_NOT_FOUND);
    }

    const validRoles = ['customer', 'staff'];
    if (!validRoles.includes(accessData.role)) {
      throw new AppError('Invalid role', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_ROLE);
    }

    const validPermissions = complianceConstants.PERMISSION_LEVELS;
    if (!accessData.permissions.every(p => Object.values(validPermissions).includes(p))) {
      throw new AppError('Invalid permissions', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_PERMISSIONS);
    }

    const [accessRecord] = await DataAccess.upsert({
      user_id: accessData.userId,
      shareWithMerchants: accessData.permissions.includes('read'),
      shareWithThirdParties: accessData.permissions.includes('write'),
    }, { transaction });

    logger.info(`Data access managed for ${accessData.role} ${accessData.userId} by merchant ${merchantId}`);
    return {
      merchantId,
      accessRecord,
      language: merchant.preferred_language || 'en',
      action: 'dataAccessManaged',
    };
  } catch (error) {
    throw handleServiceError('manageDataAccess', error, complianceConstants.COMPLIANCE_ERRORS.SYSTEM_ERROR);
  }
}

module.exports = {
  encryptData,
  enforceGDPR,
  manageDataAccess,
};