'use strict';

const { enableScreenReaders, adjustFonts, supportMultiLanguage } = require('@services/merchant/accessibilityService');
const { formatMessage } = require('@utils/localization');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const localizationConstants = require('@constants/common/localizationConstants');

const catchAsync = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const accessibilityController = {
  enableScreenReaders: catchAsync(async (req, res, next) => {
    const { merchantId } = req.params;
    const { ipAddress } = req;
    const user = req.user || {};

    const result = await enableScreenReaders(merchantId, ipAddress);
    
    // Log audit action
    await auditService.logAction({
      userId: user.id || merchantId,
      role: 'merchant',
      action: merchantConstants.STAFF_CONSTANTS.DEFAULT_TASK_TYPES.SCREEN_READER_ENABLED,
      details: { merchantId, screenReaderEnabled: true },
      ipAddress,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: merchantId,
      notificationType: merchantConstants.NOTIFICATION_TYPES.SCREEN_READER_ENABLED,
      messageKey: 'accessibility.screen_reader_enabled',
      messageParams: { merchantId },
      role: 'merchant',
      module: 'accessibility',
      deliveryMethod: 'push',
    });

    // Emit socket event
    await socketService.emit(req.io, 'ACCESSIBILITY_UPDATED', {
      userId: merchantId,
      role: 'merchant',
      action: 'screenReaderEnabled',
      details: result,
    }, `merchant:${merchantId}`);

    res.status(200).json({
      success: true,
      data: result,
      message: formatMessage('merchant', 'accessibility', result.language, 'accessibility.screen_reader_enabled', { merchantId }),
    });
  }),

  adjustFonts: catchAsync(async (req, res, next) => {
    const { merchantId } = req.params;
    const { fontSize } = req.body;
    const { ipAddress } = req;
    const user = req.user || {};

    const result = await adjustFonts(merchantId, fontSize, ipAddress);

    // Log audit action
    await auditService.logAction({
      userId: user.id || merchantId,
      role: 'merchant',
      action: merchantConstants.STAFF_CONSTANTS.DEFAULT_TASK_TYPES.FONT_SIZE_ADJUSTED,
      details: { merchantId, fontSize, previousFontSize: result.previousFontSize },
      ipAddress,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: merchantId,
      notificationType: merchantConstants.NOTIFICATION_TYPES.FONT_SIZE_ADJUSTED,
      messageKey: 'accessibility.font_size_adjusted',
      messageParams: { fontSize },
      role: 'merchant',
      module: 'accessibility',
      deliveryMethod: 'push',
    });

    // Emit socket event
    await socketService.emit(req.io, 'ACCESSIBILITY_UPDATED', {
      userId: merchantId,
      role: 'merchant',
      action: 'fontAdjusted',
      details: result,
    }, `merchant:${merchantId}`);

    res.status(200).json({
      success: true,
      data: result,
      message: formatMessage('merchant', 'accessibility', result.language, 'accessibility.font_size_adjusted', { fontSize }),
    });
  }),

  supportMultiLanguage: catchAsync(async (req, res, next) => {
    const { merchantId } = req.params;
    const { language } = req.body;
    const { ipAddress } = req;
    const user = req.user || {};

    const result = await supportMultiLanguage(merchantId, language, ipAddress);

    // Log audit action
    await auditService.logAction({
      userId: user.id || merchantId,
      role: 'merchant',
      action: merchantConstants.STAFF_CONSTANTS.DEFAULT_TASK_TYPES.LANGUAGE_UPDATED,
      details: { merchantId, language, previousLanguage: result.previousLanguage },
      ipAddress,
    });

    // Send notification
    await notificationService.sendNotification({
      userId: merchantId,
      notificationType: merchantConstants.NOTIFICATION_TYPES.LANGUAGE_UPDATED,
      messageKey: 'accessibility.language_updated',
      messageParams: { language },
      role: 'merchant',
      module: 'accessibility',
      deliveryMethod: 'push',
    });

    // Emit socket event
    await socketService.emit(req.io, 'ACCESSIBILITY_UPDATED', {
      userId: merchantId,
      role: 'merchant',
      action: 'languageSupported',
      details: result,
    }, `merchant:${merchantId}`);

    res.status(200).json({
      success: true,
      data: result,
      message: formatMessage('merchant', 'accessibility', result.language, 'accessibility.language_updated', { language }),
    });
  }),
};

module.exports = accessibilityController;