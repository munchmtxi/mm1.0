'use strict';

const { sequelize } = require('@models');
const dataProtectionService = require('@services/merchant/compliance/dataProtectionService');
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

  if (action === 'dataEncrypted' && metadata.dataFields) {
    multipliers *= actionConfig.multipliers.dataFields * metadata.dataFields || 1;
  }
  if (action === 'gdprEnforced' && metadata.isCompliant) {
    multipliers *= actionConfig.multipliers.complianceStatus * (metadata.isCompliant ? 1 : 0.5) || 1;
  }
  if (action === 'dataAccessManaged' && metadata.permissionsCount) {
    multipliers *= actionConfig.multipliers.permissionsCount * metadata.permissionsCount || 1;
  }

  multipliers *= actionConfig.multipliers[role] || 1;
  return Math.min(points * multipliers, gamificationConstants.MAX_POINTS_PER_ACTION);
};

const encryptData = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { data } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await dataProtectionService.encryptData(merchantId, data, ipAddress, transaction);
    const points = calculatePoints(result.action, { dataFields: Object.keys(data.sensitiveData || {}).length }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'compliance.dataEncrypted',
        messageParams: { role: result.role, userId: result.userId },
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
        metadata: { dataFields: Object.keys(data.sensitiveData || {}).length },
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
        action: 'encrypt_data',
        details: { merchantId, userId: result.userId, role: result.role, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:dataEncrypted', { merchantId, userId: result.userId, role: result.role, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const enforceGDPR = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await dataProtectionService.enforceGDPR(merchantId, ipAddress, transaction);
    const points = calculatePoints(result.action, { isCompliant: result.isCompliant }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: merchantId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: result.isCompliant ? 'compliance.gdprEnforced' : 'compliance.gdprComplianceIssue',
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
        action: 'enforce_gdpr',
        details: { merchantId, isCompliant: result.isCompliant, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:gdprEnforced', { merchantId, isCompliant: result.isCompliant, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

const manageDataAccess = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { accessData } = req.body;
  const ipAddress = req.ip;
  const io = req.app.get('socketio');

  const transaction = await sequelize.transaction();
  try {
    const result = await dataProtectionService.manageDataAccess(merchantId, accessData, ipAddress, transaction);
    const points = calculatePoints(result.action, { permissionsCount: accessData.permissions.length }, 'merchant');

    await notificationService.sendNotification(
      {
        userId: accessData.userId,
        notificationType: merchantConstants.CRM_CONSTANTS.NOTIFICATION_TYPES.PROMOTION,
        messageKey: 'compliance.dataAccessManaged',
        messageParams: { resource: accessData.resource },
        priority: 'MEDIUM',
        role: accessData.role,
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
        metadata: { permissionsCount: accessData.permissions.length },
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
        action: 'manage_data_access',
        details: { merchantId, userId: accessData.userId, resource: accessData.resource, points },
        ipAddress,
      },
      transaction
    );

    await socketService.emit(io, 'merchant:compliance:dataAccessManaged', { merchantId, userId: accessData.userId, resource: accessData.resource, points }, `merchant:${merchantId}`);

    await transaction.commit();
    res.status(200).json({ success: true, data: { ...result, points } });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
});

module.exports = { encryptData, enforceGDPR, manageDataAccess };