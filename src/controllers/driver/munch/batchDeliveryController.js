'use strict';

const batchDeliveryService = require('@services/driver/munch/batchDeliveryService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const munchConstants = require('@constants/common/munchConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function createBatchDelivery(req, res, next) {
  try {
    const { deliveryIds } = req.body;
    const driverId = req.user.driverId;
    const routeOptimization = await batchDeliveryService.createBatchDelivery(deliveryIds, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: routeOptimization,
      message: formatMessage(
        'driver',
        'batch_delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'batch_delivery.created',
        { batchId: routeOptimization.id }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getBatchDeliveryDetails(req, res, next) {
  try {
    const { batchId } = req.params;
    const batchDetails = await batchDeliveryService.getBatchDeliveryDetails(batchId, auditService, pointService);

    res.status(200).json({
      status: 'success',
      data: batchDetails,
    });
  } catch (error) {
    next(error);
  }
}

async function updateBatchDeliveryStatus(req, res, next) {
  try {
    const { batchId, status } = req.body;
    const driverId = req.user.driverId;

    await batchDeliveryService.updateBatchDeliveryStatus(batchId, status, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'batch_delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'batch_delivery.status_updated',
        { batchId, status }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function optimizeBatchDeliveryRoute(req, res, next) {
  try {
    const { batchId } = req.params;
    const driverId = req.user.driverId;
    const optimizedRoute = await batchDeliveryService.optimizeBatchDeliveryRoute(batchId, driverId, auditService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: optimizedRoute,
      message: formatMessage(
        'driver',
        'batch_delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'batch_delivery.route_optimized',
        { batchId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBatchDelivery,
  getBatchDeliveryDetails,
  updateBatchDeliveryStatus,
  optimizeBatchDeliveryRoute,
};