'use strict';

/**
 * taskManagementService.js
 * Manages staff tasks for munch (staff role). Assigns tasks, tracks progress,
 * notifies delays, and awards task points.
 * Last Updated: May 26, 2025
 */

const { Task, Staff, Notification, GamificationPoints } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Allocates role-specific tasks to staff.
 * @param {number} staffId - Staff ID.
 * @param {Object} task - Task details (taskType, description, dueDate).
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Assigned task.
 */
async function assignTask(staffId, task, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const validTasks = staffRolesConstants.STAFF_TASK_TYPES[staff.position]?.munch?.map(t => t.id) || [];
    if (!validTasks.includes(task.taskType)) {
      throw new AppError('Invalid task type for role', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const newTask = await Task.create({
      staff_id: staffId,
      branch_id: staff.branch_id,
      task_type: task.taskType,
      description: task.description,
      status: staffRolesConstants.STAFF_TASK_STATUSES.ASSIGNED,
      due_date: task.dueDate,
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, taskId: newTask.id, action: 'assign_task' },
      ipAddress,
    });

    const message = localization.formatMessage('task.task_assigned', { taskId: newTask.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
      message,
      role: 'staff',
      module: 'munch',
      taskId: newTask.id,
    });

    socketService.emit(`munch:task:${staffId}`, 'task:assigned', { staffId, taskId: newTask.id });

    return newTask;
  } catch (error) {
    logger.error('Task assignment failed', { error: error.message, staffId });
    throw new AppError(`Task assignment failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

/**
 * Monitors task completion progress.
 * @param {number} taskId - Task ID.
 * @returns {Promise<Object>} Task progress.
 */
async function trackTaskProgress(taskId) {
  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new AppError('Task not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const progress = {
      taskId,
      status: task.status,
      dueDate: task.due_date,
      completedAt: task.completed_at,
    };

    socketService.emit(`munch:task:${task.staff_id}`, 'task:progress_updated', progress);

    return progress;
  } catch (error) {
    logger.error('Task progress tracking failed', { error: error.message, taskId });
    throw new AppError(`Progress tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Alerts for delayed tasks.
 * @param {number} taskId - Task ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<void>}
 */
async function notifyTaskDelay(taskId, ipAddress) {
  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new AppError('Task not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (task.status !== staffRolesConstants.STAFF_TASK_STATUSES.ASSIGNED && task.status !== staffRolesConstants.STAFF_TASK_STATUSES.IN_PROGRESS) {
      throw new AppError('Task not eligible for delay notification', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    await task.update({ status: staffRolesConstants.STAFF_TASK_STATUSES.DELAYED });

    const message = localization.formatMessage('task.task_delayed', { taskId });
    await notificationService.sendNotification({
      userId: task.staff_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
      message,
      role: 'staff',
      module: 'munch',
      taskId,
    });

    await auditService.logAction({
      userId: task.staff_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { taskId, action: 'notify_task_delay' },
      ipAddress,
    });

    socketService.emit(`munch:task:${task.staff_id}`, 'task:delayed', { taskId });
  } catch (error) {
    logger.error('Task delay notification failed', { error: error.message, taskId });
    throw new AppError(`Delay notification failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Awards task completion points.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardTaskPoints(staffId) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action;
    await pointService.awardPoints({
      userId: staffId,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: 'en',
    });

    socketService.emit(`munch:staff:${staffId}`, 'points:completed', {
      action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Task points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, error.code || staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  assignTask,
  trackTaskProgress,
  notifyTaskDelay,
  awardTaskPoints,
};