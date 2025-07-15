'use strict';

const { Merchant, Staff } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const complianceConstants = require('@constants/common/complianceConstants');
const staffConstants = require('@constants/staff/staffConstants');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function manageCertifications(merchantId, certData, ipAddress, transaction = null) {
  try {
    if (!merchantId || !certData?.type || !certData?.issueDate || !certData?.expiryDate) {
      throw new AppError('Invalid certification data', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_CERT_DATA);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language', 'business_type_details'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, complianceConstants.COMPLIANCE_ERRORS.MERCHANT_NOT_FOUND);
    }

    const validCertTypes = complianceConstants.REGULATORY_REQUIREMENTS;
    if (!Object.values(validCertTypes).includes(certData.type)) {
      throw new AppError('Invalid certification type', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_CERT_TYPE);
    }

    const certifications = merchant.business_type_details?.certifications || [];
    certifications.push({
      type: certData.type,
      issueDate: certData.issueDate,
      expiryDate: certData.expiryDate,
      status: 'active',
    });

    await merchant.update({
      business_type_details: {
        ...merchant.business_type_details,
        certifications,
      },
    }, { transaction });

    logger.info(`Certification managed for merchant ${merchantId}: ${certData.type}`);
    return {
      merchantId,
      certType: certData.type,
      language: merchant.preferred_language || 'en',
      action: 'certificationsManaged',
    };
  } catch (error) {
    throw handleServiceError('manageCertifications', error, complianceConstants.COMPLIANCE_ERRORS.SYSTEM_ERROR);
  }
}

async function verifyStaffCompliance(staffId, ipAddress, transaction = null) {
  try {
    if (!staffId) {
      throw new AppError('Invalid staff ID', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_STAFF_ID);
    }

    const staff = await Staff.findByPk(staffId, { attributes: ['id', 'user_id', 'certifications'], transaction });
    if (!staff) {
      throw new AppError('Staff not found', 404, complianceConstants.COMPLIANCE_ERRORS.STAFF_NOT_FOUND);
    }

    const certifications = staff.certifications || [];
    const complianceChecks = certifications.map(cert => ({
      type: cert,
      isValid: staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_CERTIFICATIONS.includes(cert),
    }));

    const isCompliant = complianceChecks.length > 0 && complianceChecks.every(check => check.isValid);

    logger.info(`Staff compliance verified for staff ${staffId}: ${isCompliant}`);
    return {
      staffId,
      isCompliant,
      complianceChecks,
      language: staff.user?.preferred_language || 'en',
      action: 'staffComplianceVerified',
    };
  } catch (error) {
    throw handleServiceError('verifyStaffCompliance', error, complianceConstants.COMPLIANCE_ERRORS.SYSTEM_ERROR);
  }
}

async function auditCompliance(merchantId, ipAddress, transaction = null) {
  try {
    if (!merchantId) {
      throw new AppError('Invalid merchant ID', 400, complianceConstants.COMPLIANCE_ERRORS.INVALID_MERCHANT_ID);
    }

    const merchant = await Merchant.findByPk(merchantId, { attributes: ['id', 'user_id', 'preferred_language', 'business_type_details'], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, complianceConstants.COMPLIANCE_ERRORS.MERCHANT_NOT_FOUND);
    }

    const certifications = merchant.business_type_details?.certifications || [];
    const complianceChecks = {
      hasCertifications: certifications.length > 0,
      validCertifications: certifications.every(cert => new Date(cert.expiryDate) > new Date() && cert.status === 'active'),
      meetsRegulatoryRequirements: certifications.some(cert =>
        Object.values(complianceConstants.REGULATORY_REQUIREMENTS).includes(cert.type)
      ),
    };

    const isCompliant = Object.values(complianceChecks).every(check => check);

    logger.info(`Compliance audited for merchant ${merchantId}: ${isCompliant}`);
    return {
      merchantId,
      isCompliant,
      complianceChecks,
      language: merchant.preferred_language || 'en',
      action: 'complianceAudited',
    };
  } catch (error) {
    throw handleServiceError('auditCompliance', error, complianceConstants.COMPLIANCE_ERRORS.SYSTEM_ERROR);
  }
}

module.exports = {
  manageCertifications,
  verifyStaffCompliance,
  auditCompliance,
};