'use strict';

const { Task, Staff } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function assignTask(staffId, task, ipAddress, notificationService, socketService, auditService, pointService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const validTasks = staffConstants.STAFF_TASK_TYPES[staff.position]?.munch || [];
    if (!validTasks.includes(task.taskType)) {
      throw new AppError('Invalid task type for role', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const newTask = await Task.create({
      staff_id: staffId,
      branch_id: staff.branch_id,
      task_type: task.taskType,
      description: task.description,
      status: staffConstants.STAFF_TASK_STATUSES[0], // 'assigned'
      due_date: task.dueDate,
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, taskId: newTask.id, action: 'assign_task' },
      ipAddress,
    });

    const message = formatMessage('taskManagement.task_assigned', { taskId: newTask.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
      taskId: newTask.id,
    });

    socketService.emit(`munch:task:${staffId}`, 'task:assigned', { staffId, taskId: newTask.id });

    const action = staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.find(a => a.action === 'task_completion');
    if (action) {
      await pointService.awardPoints({
        userId: staffId,
        role: staff.position,
        subRole: staff.position,
        action: action.action,
        languageCode: staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
      });
      socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
        action: action.action,
        points: action.points,
      });
    }

    return newTask;
  } catch (error) {
    logger.error('Task assignment failed', { error: error.message, staffId });
    throw new AppError(`Task assignment failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

async function trackTaskProgress(taskId, socketService, pointService) {
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

    if (task.status === staffConstants.STAFF_TASK_STATUSES[2]) { // 'completed'
      const staff = await Staff.findByPk(task.staff_id);
      const action = staffConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.find(a => a.action === 'task_completion');
      if (action && staff) {
        await pointService.awardPoints({
          userId: task.staff_id,
          role: staff.position,
          subRole: staff.position,
          action: action.action,
          languageCode: staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
        });
        socketService.emit(`munch:staff:${task.staff_id}`, 'points:awarded', {
          action: action.action,
          points: action.points,
        });
      }
    }

    return progress;
  } catch (error) {
    logger.error('Task progress tracking failed', { error: error.message, taskId });
    throw new AppError(`Progress tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function notifyTaskDelay(taskId, ipAddress, notificationService, socketService, auditService) {
  try {
    const task = await Task.findByPk(taskId);
    if (!task) {
      throw new AppError('Task not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (![staffConstants.STAFF_TASK_STATUSES[0], staffConstants.STAFF_TASK_STATUSES[1]].includes(task.status)) {
      throw new AppError('Task not eligible for delay notification', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    await task.update({ status: staffConstants.STAFF_TASK_STATUSES[3] }); // 'delayed'

    const message = formatMessage('taskManagement.task_delayed', { taskId });
    await notificationService.sendNotification({
      userId: task.staff_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TASK_ASSIGNMENT,
      message,
      role: staffConstants.STAFF_TYPES.includes(task.position) ? task.position : 'staff',
      module: 'munch',
      taskId,
    });

    await auditService.logAction({
      userId: task.staff_id,
      role: staffConstants.STAFF_TYPES.includes(task.position) ? task.position : 'staff',
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

module.exports = {
  assignTask,
  trackTaskProgress,
  notifyTaskDelay
};