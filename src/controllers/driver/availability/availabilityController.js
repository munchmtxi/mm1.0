'use strict';

const {
  setAvailability,
  getAvailability,
  toggleAvailability,
} = require('@services/driver/availability/availabilityService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driver/driverConstants');

const setAvailabilityController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { date, start_time, end_time } = req.body;
  const availability = await setAvailability(driverId, { date, start_time, end_time }, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10], // Driver registered
    data: availability,
  });
});

const getAvailabilityController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const availability = await getAvailability(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10], // Driver registered
    data: availability,
  });
});

const toggleAvailabilityController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { isAvailable } = req.body;
  await toggleAvailability(driverId, isAvailable, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10], // Driver registered
    data: { isAvailable },
  });
});

module.exports = {
  setAvailability: setAvailabilityController,
  getAvailability: getAvailabilityController,
  toggleAvailability: toggleAvailabilityController,
};