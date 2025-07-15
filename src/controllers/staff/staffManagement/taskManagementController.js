'use strict';

const taskManagementService = require('@services/staff/staffManagement/taskManagementService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function assignTask(req, res, next) {
  try {
    const { staffId, task } = req.body;
    const ipAddress = req.ip;
    const newTask = await taskManagementService.assignTask(staffId, task, ipAddress, notificationService, socketService, auditService, pointService);
    return res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task assigned successfully'
    });
  } catch (error) {
    logger.error('Task assignment failed', { error: error.message });
    next(error);
  }
}

async function trackTaskProgress(req, res, next) {
  try {
    const { taskId } = req.params;
    const progress = await taskManagementService.trackTaskProgress(taskId, socketService, pointService);
    return res.status(200).json({
      success: true,
      data: progress,
      message: 'Task progress retrieved successfully'
    });
  } catch (error) {
    logger.error('Task progress tracking failed', { error: error.message });
    next(error);
  }
}

async function notifyTaskDelay(req, res, next) {
  try {
    const { taskId } = req.params;
    const ipAddress = req.ip;
    await taskManagementService.notifyTaskDelay(taskId, ipAddress, notificationService, socketService, auditService);
    return res.status(200).json({
      success: true,
      message: 'Task delay notification sent'
    });
  } catch (error) {
    logger.error('Task delay notification failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  assignTask,
  trackTaskProgress,
  notifyTaskDelay
};