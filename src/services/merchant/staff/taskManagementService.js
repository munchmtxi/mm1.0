'use strict';

/**
 * taskManagementService.js
 * Manages task allocation, progress tracking, delay notifications, and gamification for Munch merchant service.
 * Last Updated: May 21, 2025
 */

const logger = require('@utils/logger');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization/localization');
const staffSystemConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const { Staff, Merchant, User, Task, Notification, AuditLog, GamificationPoints } = require('@models');

/**
 * Assigns a task to a staff member.
 * @param {number} staffId - Staff ID.
 * @param {Object} task - Task details { taskType, description, dueDate }.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Task details.
 */
async function allocateTask(staffId, task, io) {
  try {
    const { taskType, description, dueDate } = task;
    if (!staffId || !taskType || !description || !dueDate) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const validTaskTypes = Object.values(staffRolesConstants.STAFF_TASK_TYPES[staff.position] || {})
      .flatMap(service => service.map(t => t.id));
    if (!validTaskTypes.includes(taskType)) {
      throw new Error(staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const newTask = await Task.create({
      staff_id: staffId,
      branch_id: staff.branch_id,
      task_type: taskType,
      description,
      due_date: new Date(dueDate),
      status: staffRolesConstants.STAFF_TASK_STATUSES.ASSIGNED,
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, taskId: newTask.id, taskType },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:taskAllocated', { staffId, taskId: newTask.id, taskType }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
      messageKey: 'staff.task_allocated',
      messageParams: { taskType, dueDate: new Date(dueDate) },
      role: 'staff',
      module: 'taskManagement',
      languageCode: staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    return newTask;
  } catch (error) {
    logger.error('Error allocating task', { error: error.message });
    throw error;
  }
}

/**
 * Tracks task progress.
 * @param {number} taskId - Task ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Task progress details.
 */
async function trackTaskProgress(taskId, io) {
  try {
    if (!taskId) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);

    const task = await Task.findByPk(taskId, { include: [{ model: Staff, as: 'staff', include: [{ model: User, as: 'user' }] }] });
    if (!task) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);

    const isDelayed = task.status !== staffRolesConstants.STAFF_TASK_STATUSES.COMPLETED && new Date() > new Date(task.due_date);
    if (isDelayed && task.status !== staffRolesConstants.STAFF_TASK_STATUSES.DELAYED) {
      await task.update({ status: staffRolesConstants.STAFF_TASK_STATUSES.DELAYED });
    }

    await auditService.logAction({
      userId: task.staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { taskId, status: task.status },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:taskProgress', { taskId, status: task.status }, `staff:${task.staff_id}`);

    return { taskId, status: task.status, isDelayed };
  } catch (error) {
    logger.error('Error tracking task progress', { error: error.message });
    throw error;
  }
}

/**
 * Notifies about delayed tasks.
 * @param {number} taskId - Task ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Notification result.
 */
async function notifyTaskDelays(taskId, io) {
  try {
    if (!taskId) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);

    const task = await Task.findByPk(taskId, { include: [{ model: Staff, as: 'staff', include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] }] });
    if (!task) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);

    if (task.status === staffRolesConstants.STAFF_TASK_STATUSES.COMPLETED) {
      return { status: staffSystemConstants.STAFF_SUCCESS_MESSAGES.TASK_COMPLETED };
    }

    const isDelayed = new Date() > new Date(task.due_date);
    if (!isDelayed) return { status: 'Task not delayed' };

    if (task.status !== staffRolesConstants.STAFF_TASK_STATUSES.DELAYED) {
      await task.update({ status: staffRolesConstants.STAFF_TASK_STATUSES.DELAYED });
    }

    const result = await notificationService.sendNotification({
      userId: task.staff.user_id,
      notificationType: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
      messageKey: 'staff.task_delayed',
      messageParams: { taskType: task.task_type, dueDate: task.due_date },
      role: 'staff',
      module: 'taskManagement',
      languageCode: task.staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    socketService.emit(io, 'staff:taskDelayNotified', { taskId, staffId: task.staff_id }, `staff:${task.staff_id}`);

    return result;
  } catch (error) {
    logger.error('Error notifying task delay', { error: error.message });
    throw error;
  }
}

/**
 * Awards points for task completion.
 * @param {number} staffId - Staff ID.
 * @param {Object} io - Socket.IO instance.
 * @returns {Promise<Object>} Points awarded.
 */
async function trackTaskGamification(staffId, io) {
  try {
    if (!staffId) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }, { model: User, as: 'user' }] });
    if (!staff) throw new Error(staffSystemConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const completedTasks = await Task.count({
      where: { staff_id: staffId, status: staffRolesConstants.STAFF_TASK_STATUSES.COMPLETED },
    });

    if (completedTasks === 0) throw new Error('No completed tasks found');

    const action = staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.action;

    const points = await pointService.awardPoints({
      userId: staff.user_id,
      role: 'staff',
      subRole: staff.position,
      action,
      languageCode: staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffSystemConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, points: points.points, action },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:taskGamification', { staffId, points: points.points }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffSystemConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.WALLET_UPDATE,
      messageKey: 'staff.task_points_awarded',
      messageParams: { points: points.points },
      role: 'staff',
      module: 'taskManagement',
      languageCode: staff.merchant?.preferred_language || staffSystemConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    return points;
  } catch (error) {
    logger.error('Error tracking task gamification', { error: error.message });
    throw error;
  }
}

module.exports = {
  allocateTask,
  trackTaskProgress,
  notifyTaskDelays,
  trackTaskGamification,
};