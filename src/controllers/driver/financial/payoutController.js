'use strict';

const {
  requestPayout,
  getPayoutHistory,
  verifyPayoutMethod,
  scheduleRecurringPayout,
} = require('@services/driver/financial/payoutService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driver/driverConstants');

const requestPayoutController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { amount, method } = req.body;
  const payout = await requestPayout(driverId, amount, method, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: payout,
  });
});

const getPayoutHistoryController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const history = await getPayoutHistory(driverId, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: history,
  });
});

const verifyPayoutMethodController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { method } = req.body;
  const isVerified = await verifyPayoutMethod(driverId, method, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: { isVerified },
  });
});

const scheduleRecurringPayoutController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { frequency, amount, method } = req.body;
  await scheduleRecurringPayout(driverId, { frequency, amount, method }, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: null,
  });
});

module.exports = {
  requestPayout: requestPayoutController,
  getPayoutHistory: getPayoutHistoryController,
  verifyPayoutMethod: verifyPayoutMethodController,
  scheduleRecurringPayout: scheduleRecurringPayoutController,
};