'use strict';

const {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  exportTaxData,
} = require('@services/driver/financial/taxService');
const auditService = require('@services/common/auditService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const { sendResponse } = require('@utils/responseHandler');
const catchAsync = require('@utils/catchAsync');
const driverConstants = require('@constants/driver/driverConstants');

const calculateTaxController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { period } = req.query;
  const taxDetails = await calculateTax(driverId, period, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: taxDetails,
  });
});

const generateTaxReportController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { period } = req.query;
  const report = await generateTaxReport(driverId, period, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: report,
  });
});

const updateTaxSettingsController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { filingFrequency, country } = req.body;
  await updateTaxSettings(driverId, { filingFrequency, country }, { pointService, auditService, notificationService, socketService });
  sendResponse(res, 200, {
    message: driverConstants.SUCCESS_MESSAGES[10],
    data: null,
  });
});

const exportTaxDataController = catchAsync(async (req, res) => {
  const { driverId } = req.user;
  const { format } = req.query;
  const data = await exportTaxData(driverId, format, { pointService, auditService, notificationService, socketService });
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=tax_data_${driverId}.${format}`);
  res.send(data);
});

module.exports = {
  calculateTax: calculateTaxController,
  generateTaxReport: generateTaxReportController,
  updateTaxSettings: updateTaxSettingsController,
  exportTaxData: exportTaxDataController,
};