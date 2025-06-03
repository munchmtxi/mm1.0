'use strict';

/**
 * regulatoryService.js
 * Manages certifications, staff/driver compliance, and regulatory audits for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { Merchant, Staff, Driver, AuditLog, Notification } = require('@models');

/**
 * Tracks safety and health permits for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} certData - Certification data (type, issueDate, expiryDate).
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Updated merchant.
 */
async function manageCertifications(merchantId, certData, io) {
  try {
    if (!merchantId || !certData?.type || !certData?.issueDate || !certData?.expiryDate) {
      throw new Error('Merchant ID, certification type, issue date, and expiry date required');
    }

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const validCertTypes = merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS;
    if (!Object.values(validCertTypes).includes(certData.type)) {
      throw new Error('Invalid certification type');
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
    });

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'manage_certifications',
      details: { merchantId, certData },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'compliance:certificationsManaged', {
      merchantId,
      certType: certData.type,
    }, `merchant:${merchantId}`);

    await notificationService.sendNotification({
      userId: merchant.user_id,
      notificationType: 'certification_updated',
      messageKey: 'compliance.certification_updated',
      messageParams: { certType: certData.type },
      role: 'merchant',
      module: 'compliance',
      languageCode: merchant.preferred_language || 'en',
    });

    return merchant;
  } catch (error) {
    logger.error('Error managing certifications', { error: error.message });
    throw error;
  }
}

/**
 * Ensures staff certifications are valid.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Compliance status.
 */
async function verifyStaffCompliance(staffId, io) {
  try {
    if (!staffId) throw new Error('Staff ID required');

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error('Staff not found');

    const certifications = staff.certifications || [];
    const complianceChecks = certifications.map(cert => ({
      type: cert.type,
      isValid: new Date(cert.expiryDate) > new Date() && cert.status === 'active',
    }));

    const isCompliant = complianceChecks.length > 0 && complianceChecks.every(check => check.isValid);

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: 'verify_staff_compliance',
      details: { staffId, isCompliant, complianceChecks },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'compliance:staffVerified', {
      staffId,
      isCompliant,
    }, `staff:${staffId}`);

    if (!isCompliant) {
      await notificationService.sendNotification({
        userId: staff.user_id,
        notificationType: 'staff_compliance_issue',
        messageKey: 'compliance.staff_compliance_issue',
        messageParams: {},
        role: 'staff',
        module: 'compliance',
        languageCode: staff.user?.preferred_language || 'en',
      });
    }

    return { isCompliant, complianceChecks };
  } catch (error) {
    logger.error('Error verifying staff compliance', { error: error.message });
    throw error;
  }
}

/**
 * Ensures driver certifications are valid.
 * @param {number} driverId - Driver ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Compliance status.
 */
async function verifyDriverCompliance(driverId, io) {
  try {
    if (!driverId) throw new Error('Driver ID required');

    const driver = await Driver.findByPk(driverId);
    if (!driver) throw new Error('Driver not found');

    const certifications = driver.certifications || [];
    const complianceChecks = certifications.map(cert => ({
      type: cert.type,
      isValid: new Date(cert.expiryDate) > new Date() && cert.status === 'active',
    }));

    const isCompliant = complianceChecks.length > 0 && complianceChecks.every(check => check.isValid);

    await auditService.logAction({
      userId: driver.user_id,
      role: 'driver',
      action: 'verify_driver_compliance',
      details: { driverId, isCompliant, complianceChecks },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'compliance:driverVerified', {
      driverId,
      isCompliant,
    }, `driver:${driverId}`);

    if (!isCompliant) {
      await notificationService.sendNotification({
        userId: driver.user_id,
        notificationType: 'driver_compliance_issue',
        messageKey: 'compliance.driver_compliance_issue',
        messageParams: {},
        role: 'driver',
        module: 'compliance',
        languageCode: driver.user?.preferred_language || 'en',
      });
    }

    return { isCompliant, complianceChecks };
  } catch (error) {
    logger.error('Error verifying driver compliance', { error: error.message });
    throw error;
  }
}

/**
 * Conducts regulatory compliance checks for a merchant.
 * @param {number} merchantId - Merchant ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Compliance status.
 */
async function auditCompliance(merchantId, io) {
  try {
    if (!merchantId) throw new Error('Merchant ID required');

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) throw new Error(merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);

    const certifications = merchant.business_type_details?.certifications || [];
    const complianceChecks = {
      hasCertifications: certifications.length > 0,
      validCertifications: certifications.every(cert => new Date(cert.expiryDate) > new Date() && cert.status === 'active'),
      meetsRegulatoryRequirements: certifications.some(cert =>
        Object.values(merchantConstants.COMPLIANCE_CONSTANTS.REGULATORY_REQUIREMENTS).includes(cert.type)
      ),
    };

    const isCompliant = Object.values(complianceChecks).every(check => check);

    await auditService.logAction({
      userId: merchant.user_id,
      role: 'merchant',
      action: 'audit_compliance',
      details: { merchantId, isCompliant, complianceChecks },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'compliance:audited', {
      merchantId,
      isCompliant,
    }, `merchant:${merchantId}`);

    if (!isCompliant) {
      await notificationService.sendNotification({
        userId: merchant.user_id,
        notificationType: 'compliance_issue',
        messageKey: 'compliance.compliance_issue',
        messageParams: {},
        role: 'merchant',
        module: 'compliance',
        languageCode: merchant.preferred_language || 'en',
      });
    }

    return { isCompliant, complianceChecks };
  } catch (error) {
    logger.error('Error auditing compliance', { error: error.message });
    throw error;
  }
}

module.exports = {
  manageCertifications,
  verifyStaffCompliance,
  verifyDriverCompliance,
  auditCompliance,
};