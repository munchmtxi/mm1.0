'use strict';

const routeOptimizationService = require('@services/driver/location/routeOptimizationService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const routeOptimizationConstants = require('@constants/driver/routeOptimizationConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function calculateRoute(req, res, next) {
  try {
    const { origin, destination } = req.body;
    const routeDetails = await routeOptimizationService.calculateOptimalRoute(origin, destination, pointService);

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: routeOptimizationConstants.NOTIFICATION_TYPES.ROUTE_CALCULATED,
      message: formatMessage(
        'driver',
        'route',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'route.calculated',
        { distance: routeDetails.distance }
      ),
      priority: 'LOW',
    });

    socketService.emit(null, routeOptimizationConstants.EVENT_TYPES.ROUTE_CALCULATED, { routeDetails });

    res.status(200).json({
      status: 'success',
      data: routeDetails,
    });
  } catch (error) {
    next(error);
  }
}

async function updateRoute(req, res, next) {
  try {
    const { driverId, routeId } = req.params;
    const { waypoints } = req.body;

    await routeOptimizationService.updateRoute(driverId, routeId, waypoints, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'route',
        driverConstants.DRIVER_SETTINGS.DEFAULT_LANGUAGE,
        'route.updated',
        { routeId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getRouteDetails(req, res, next) {
  try {
    const { routeId } = req.params;
    const routeDetails = await routeOptimizationService.getRouteDetails(routeId, auditService, pointService);

    res.status(200).json({
      status: 'success',
      data: routeDetails,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  calculateRoute,
  updateRoute,
  getRouteDetails,
};