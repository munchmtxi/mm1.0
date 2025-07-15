'use strict';

const {
  shareLocation,
  getLocation,
  configureMap,
} = require('@services/driver/location/locationService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driver/driverConstants');

const shareLocationController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { coordinates } = req.body;
  await shareLocation(driverId, coordinates, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: null,
  });
});

const getLocationController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const location = await getLocation(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: location,
  });
});

const configureMapController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { country } = req.body;
  const mapConfig = await configureMap(driverId, country, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: mapConfig,
  });
});

module.exports = {
  shareLocation: shareLocationController,
  getLocation: getLocationController,
  configureMap: configureMapController,
};