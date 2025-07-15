'use strict';

const {
  createShift,
  getShiftDetails,
  updateShift,
  notifyHighDemand,
} = require('@services/driver/scheduling/schedulingService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driver/driverConstants');

const createShiftController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { start_time, end_time, shift_type } = req.body;
  const shift = await createShift(driverId, { start_time, end_time, shift_type }, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: shift,
  });
});

const getShiftDetailsController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const shifts = await getShiftDetails(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: shifts,
  });
});

const updateShiftController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { shiftId } = req.params;
  const { start_time, end_time, shift_type, status } = req.body;
  await updateShift(driverId, shiftId, { start_time, end_time, shift_type, status }, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: { shiftId },
  });
});

const notifyHighDemandController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  await notifyHighDemand(driverId, { auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: null,
  });
});

module.exports = {
  createShift: createShiftController,
  getShiftDetails: getShiftDetailsController,
  updateShift: updateShiftController,
  notifyHighDemand: notifyHighDemandController,
};