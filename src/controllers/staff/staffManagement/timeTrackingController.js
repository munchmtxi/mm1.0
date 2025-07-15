'use strict';

const timeTrackingService = require('@services/staff/staffManagement/timeTrackingService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function recordClockInOut(req, res, next) {
  try {
    const { staffId, action } = req.body;
    const ipAddress = req.ip;
    const record = await timeTrackingService.recordClockInOut(staffId, action, ipAddress, notificationService, socketService, auditService, pointService);
    return res.status(201).json({
      success: true,
      data: record,
      message: `Clock-${action} recorded successfully`
    });
  } catch (error) {
    logger.error('Clock-in/out failed', { error: error.message });
    next(error);
  }
}

async function calculateShiftDuration(req, res, next) {
  try {
    const { staffId } = req.params;
    const totalHours = await timeTrackingService.calculateShiftDuration(staffId, socketService);
    return res.status(200).json({
      success: true,
      data: { staffId, totalHours },
      message: 'Shift duration calculated successfully'
    });
  } catch (error) {
    logger.error('Shift duration calculation failed', { error: error.message });
    next(error);
  }
}

async function generateTimeReport(req, res, next) {
  try {
    const { staffId } = req.params;
    const ipAddress = req.ip;
    const report = await timeTrackingService.generateTimeReport(staffId, ipAddress, notificationService, socketService, auditService, securityService, pointService);
    return res.status(200).json({
      success: true,
      data: report,
      message: 'Time report generated successfully'
    });
  } catch (error) {
    logger.error('Time report generation failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  recordClockInOut,
  calculateShiftDuration,
  generateTimeReport
};