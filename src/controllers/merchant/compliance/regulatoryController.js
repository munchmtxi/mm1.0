'use strict';

const { sequelize } = require('@models');
const regulatoryService = require('@services/merchant/compliance/regulatoryService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const gamificationService = require('@services/common/gamificationService');
const merchantConstants = require('@constants/merchantConstants');
const gamificationConstants = require('@constants/common/gamificationConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const calculatePoints = (action, metadata, role = 'merchant') => {
  const actionConfig = gamificationConstants.MERCHANT_ACTIONS.find((a) => a.action === action);
  if (!actionConfig) return 0;

  let points = actionConfig.basePoints;
  let multipliers = 1;

  if (action === 'certificationsManaged' && metadata.certCount) {
    multipliers *= actionConfig.multipliers.certCount * metadata.certCount || 1;
  }
  if (['staffComplianceVerified', 'driverComplianceVerified', 'complianceAudited'].includes(action) && metadata.isCompliant !== undefined) {
    multipliers *= actionConfig.multipliers.complianceStatus * (metadata.isCompliant ? 1 : 0.5) || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const manageCertifications = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { certData } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await regulatoryService.manageCertifications(merchantId, certData, ipAddress, transaction);
    const points = calculatePoints(result.action, { certCount: 1 }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'compliance.certificationsManaged',
        messageParams: { certType: result.certType },
        priority: 'MEDIUM',
        role: 'merchant',
        module: 'compliance',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { certCount: 1 },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'compliance.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'compliance',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'manage_certifications',
        details: { merchantId, certType: result.certType, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:certificationsManaged', { merchantId, certType: result.certType, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const verifyStaffCompliance = catchAsync(async (req, res) => {
  const { staffId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await regulatoryService.verifyStaffCompliance(staffId, ipAddress, transaction);
    const points = calculatePoints(result.action, { isCompliant: result.isCompliant }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: staffId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: result.isCompliant ? 'compliance.staffComplianceVerified' : 'compliance.staffComplianceIssue',
        messageParams: {},
        priority: result.isCompliant ? 'MEDIUM' : 'HIGH',
        role: 'staff',
        module: 'compliance',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(staffId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { isCompliant: result.isCompliant },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: staffId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION,
          messageKey: 'compliance.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'compliance',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: staffId,
        role: 'staff',
        action: 'verify_staff_compliance',
        details: { staffId, isCompliant: result.isCompliant, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:staffComplianceVerification', { staffId, isCompliant: result.isCompliant, points }, `staff:${staffId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const verifyDriverCompliance = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await regulatoryService.verifyDriverCompliance(driverId, ipAddress, transaction);
    const points = calculatePoints(result.action, { isCompliant: result.isCompliant }, 'merchant');

    await notificationService.sendNotification(
      userId: driverId,
      notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
      messageKey: result.isCompliant ? 'compliance.driverComplianceVerified' : 'compliance.driverComplianceIssue',
      messageParams: {},
      priority: result.isCompliant ? 'MEDIUM' : 'HIGH',
      role: 'driver',
      module: 'compliance',
      languageCode: result.language,
    },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(driverId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { isCompliant: result.isCompliant },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: driverId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION,
          messageKey: 'compliance.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'compliance',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: driverId,
        role: 'driver',
        action: 'verify_driver_compliance',
        details: { driverId, isCompliant: result.isCompliant, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:driverComplianceVerification', { driverId, isCompliant: result.isCompliant, points }, `driver:${driverId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const auditCompliance = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await regulatoryService.auditCompliance(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { isCompliant: result.isCompliant }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: result.isCompliant ? 'compliance.complianceAudited' : 'compliance.complianceIssue',
        messageParams: {},
        priority: result.isCompliant ? 'MEDIUM' : 'HIGH',
        role: 'merchant',
        module: 'compliance',
        languageCode: result.language,
      },
      transaction
    );

    if (points > 0) {
      await gamificationService.awardPoints(merchantId, result.action, points, {
        io,
        role: 'merchant',
        languageCode: result.language,
        metadata: { isCompliant: result.isCompliant },
      }, transaction);

      await notificationService.sendNotification(
        {
          userId: merchantId,
          notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
          messageKey: 'compliance.pointsAwarded',
          messageParams: { points, action: result.action },
          priority: 'LOW',
          role: 'merchant',
          module: 'compliance',
          languageCode: result.language,
        },
        transaction
      );
    }

    await auditService.logAction(
      {
        userId: merchantId,
        role: 'merchant',
        action: 'audit_compliance',
        details: { merchantId, isCompliant: result.isCompliant, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:complianceAudited', { merchantId, isCompliant: result.isCompliant, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { manageCertifications, verifyStaffCompliance, verifyDriverCompliance, auditCompliance };