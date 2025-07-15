'use strict';

const schedulingService = require('@services/staff/staffManagement/schedulingService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function createShift(req, res, next) {
  try {
    const { restaurantId, schedule } = req.body;
    const ipAddress = req.ip;
    const shift = await schedulingService.createShiftSchedule(restaurantId, schedule, ipAddress, notificationService, socketService, auditService, pointService);
    return res.status(201).json({
      success: true,
      data: shift,
      message: 'Shift created successfully'
    });
  } catch (error) {
    logger.error('Create shift failed', { error: error.message });
    next(error);
  }
}

async function updateShift(req, res, next) {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;
    const ipAddress = req.ip;
    const shift = await schedulingService.updateShift(scheduleId, updates, ipAddress, notificationService, socketService, auditService, pointService);
    return res.status(200).json({
      success: true,
      data: shift,
      message: 'Shift updated successfully'
    });
  } catch (error) {
    logger.error('Update shift failed', { error: error.message });
    next(error);
  }
}

async function notifyShiftChange(req, res, next) {
  try {
    const { staffId } = req.params;
    const ipAddress = req.ip;
    await schedulingService.notifyShiftChange(staffId, ipAddress, notificationService, socketService, auditService);
    return res.status(200).json({
      success: true,
      message: 'Shift change notification sent'
    });
  } catch (error) {
    logger.error('Notify shift change failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  createShift,
  updateShift,
  notifyShiftChange
};