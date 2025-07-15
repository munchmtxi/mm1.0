'use strict';

const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const notificationService = require('@services/common/notificationService');
const mapService = require('@services/common/mapService');
const locationService = require('@services/common/locationService');
const auditService = require('@services/common/auditService');
const crossVerticalOutlookService = require('@services/customer/crossVerticalOutlookService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatMessage } = require('@utils/localization');

async function getCustomerServices(req, res, next) {
  const { sequelize, io } = req.app;
  const { customerId } = req.user;
  const { languageCode = 'en' } = req.query;

  try {
    const services = await crossVerticalOutlookService.getCustomerServices(sequelize, customerId, languageCode);

    await pointService.awardPoints(customerId, 'services_viewed', customerGamificationConstants.GAMIFICATION_ACTIONS.crossVerticalOutlook.find(a => a.action === 'services_viewed').points, {
      io,
      role: 'customer',
      languageCode,
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'SERVICES_VIEWED',
      details: { services: Object.keys(services) },
      ipAddress: req.ip,
    });

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: 'services_viewed',
      messageKey: 'crossVerticalOutlook.services_viewed',
      messageParams: { serviceCount: Object.values(services).reduce((sum, arr) => sum + arr.length, 0) },
      role: 'customer',
      module: 'crossVerticalOutlook',
      languageCode,
    });

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'crossVerticalOutlook', languageCode, 'success.services_fetched'),
      data: services,
    });
  } catch (error) {
    logger.logErrorEvent('Failed to fetch customer services', { customerId, error: error.message });
    next(new AppError(
      formatMessage('customer', 'crossVerticalOutlook', languageCode, 'errors.services_fetch_failed'),
      error.statusCode || 500,
      error.errorCode || 'SERVICES_FETCH_FAILED',
      error.details,
      error.meta
    ));
  }
}

async function cancelService(req, res, next) {
  const { sequelize, io } = req.app;
  const { customerId } = req.user;
  const { serviceType, serviceId, languageCode = 'en' } = req.body;

  try {
    const service = await crossVerticalOutlookService.cancelService(sequelize, customerId, serviceType, serviceId, languageCode);

    await pointService.awardPoints(customerId, 'service_cancelled', customerGamificationConstants.GAMIFICATION_ACTIONS.crossVerticalOutlook.find(a => a.action === 'service_cancelled').points, {
      io,
      role: 'customer',
      languageCode,
    });

    await auditService.logAction({
      userId: customerId,
      role: 'customer',
      action: 'SERVICE_CANCELLED',
      details: { serviceType, serviceId },
      ipAddress: req.ip,
    });

    await socketService.emit(io, 'SERVICE_CANCELLED', {
      userId: customerId,
      role: 'customer',
      auditAction: 'SERVICE_CANCELLED',
      details: { serviceType, serviceId },
    }, `customer:${customerId}`, languageCode);

    await notificationService.sendNotification({
      userId: customerId,
      notificationType: 'service_cancelled',
      messageKey: 'crossVerticalOutlook.service_cancelled',
      messageParams: { serviceType },
      role: 'customer',
      module: 'crossVerticalOutlook',
      languageCode,
    });

    res.status(200).json({
      status: 'success',
      message: formatMessage('customer', 'crossVerticalOutlook', languageCode, 'success.service_cancelled'),
      data: service,
    });
  } catch (error) {
    logger.logErrorEvent(`Failed to cancel ${serviceType} service`, { customerId, serviceId, error: error.message });
    next(new AppError(
      formatMessage('customer', 'crossVerticalOutlook', languageCode, `errors.${error.errorCode?.toLowerCase() || 'service_cancellation_failed'}`),
      error.statusCode || 500,
      error.errorCode || 'SERVICE_CANCELLATION_FAILED',
      error.details,
      error.meta
    ));
  }
}

module.exports = {
  getCustomerServices,
  cancelService,
};