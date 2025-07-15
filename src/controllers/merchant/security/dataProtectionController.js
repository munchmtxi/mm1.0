'use strict';

const {
  encryptSensitiveData,
  complyWithRegulations,
  restrictDataAccess,
  auditDataSecurity,
} = require('@services/merchant/security/dataProtectionService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const encryptSensitiveDataController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const data = req.body;
  const result = await encryptSensitiveData(merchantId, data);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[0], // dataEncrypted
    details: { merchantId, dataType: data.type || 'sensitive' },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[0],
    messageKey: 'security.dataProtection.dataEncrypted',
    messageParams: { dataType: data.type || 'sensitive', merchantId },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  await socketService.emit(null, 'data:encrypted', result, `merchant:${merchantId}`);

  // Award points
  const pointsRecord = await pointService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[0],
    languageCode: req.user.preferred_language || 'en',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[0],
    messageKey: 'security.dataProtection.pointsAwarded',
    messageParams: { points: pointsRecord.points, action: 'data encryption' },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'security', 'en', 'dataProtection.dataEncrypted', {
      dataType: data.type || 'sensitive',
      merchantId,
    }),
    data: result,
  });
});

const complyWithRegulationsController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const result = await complyWithRegulations(merchantId);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[1], // gdprEnforced
    details: { merchantId, standards: result.standards },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[1],
    messageKey: 'security.dataProtection.regulationsComplied',
    messageParams: { standards: result.standards.join(', '), merchantId },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  await socketService.emit(null, 'compliance:updated', result, `merchant:${merchantId}`);

  // Award points
  const pointsRecord = await pointService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[1],
    languageCode: req.user.preferred_language || 'en',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[1],
    messageKey: 'security.dataProtection.pointsAwarded',
    messageParams: { points: pointsRecord.points, action: 'compliance verification' },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'security', 'en', 'dataProtection.regulationsComplied', {
      standards: result.standards.join(', '),
      merchantId,
    }),
    data: result,
  });
});

const restrictDataAccessController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const accessRequest = req.body;
  const result = await restrictDataAccess(merchantId, accessRequest);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[2], // dataAccessManaged
    details: { merchantId, userId: accessRequest.userId, permission: accessRequest.permission },
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[2],
    messageKey: 'security.dataProtection.accessRestricted',
    messageParams: {
      userId: accessRequest.userId,
      permission: accessRequest.permission,
      merchantId,
    },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  await socketService.emit(null, 'access:restricted', result, `merchant:${merchantId}`);

  // Award points
  const pointsRecord = await pointService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[2],
    languageCode: req.user.preferred_language || 'en',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[2],
    messageKey: 'security.dataProtection.pointsAwarded',
    messageParams: { points: pointsRecord.points, action: 'data access restriction' },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'security', 'en', 'dataProtection.accessRestricted', {
      userId: accessRequest.userId,
      permission: accessRequest.permission,
      merchantId,
    }),
    data: result,
  });
});

const auditDataSecurityController = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const result = await auditDataSecurity(merchantId);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[6], // complianceAudited
    details: result,
    ipAddress: req.ip || '0.0.0.0',
    metadata: { merchantId },
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[6],
    messageKey: 'security.dataProtection.securityAudited',
    messageParams: { auditCount: result.auditCount, merchantId },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  await socketService.emit(null, 'audit:completed', result, `merchant:${merchantId}`);

  // Award points
  const pointsRecord = await pointService.awardPoints({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[6],
    languageCode: req.user.preferred_language || 'en',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    merchant_id: merchantId,
    notificationType: merchantConstants.COMPLIANCE_CONSTANTS.POINT_AWARD_ACTIONS[6],
    messageKey: 'security.dataProtection.pointsAwarded',
    messageParams: { points: pointsRecord.points, action: 'security audit' },
    role: 'merchant',
    module: 'security',
    languageCode: req.user.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'security', 'en', 'dataProtection.securityAudited', {
      auditCount: result.auditCount,
      merchantId,
    }),
    data: result,
  });
});

module.exports = {
  encryptSensitiveDataController,
  complyWithRegulationsController,
  restrictDataAccessController,
  auditDataSecurityController,
};