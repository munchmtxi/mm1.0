'use strict';

const logger = require('@utils/logger');
const staffConstants = require('@constants/staff/staffConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const chefConstants = require('@constants/staff/chefConstants');
const managerConstants = require('@constants/staff/managerConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const driverConstants = require('@constants/staff/driverConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const { Staff, Merchant, User, Task, Shift, MerchantBranch } = require('@models');
const { Op } = require('sequelize');

const roleConstantsMap = {
  front_of_house: frontOfHouseConstants,
  back_of_house: backOfHouseConstants,
  chef: chefConstants,
  manager: managerConstants,
  butcher: butcherConstants,
  barista: baristaConstants,
  cashier: cashierConstants,
  driver: driverConstants,
  stock_clerk: stockClerkConstants,
};

async function allocateTask(staffId, task, io, auditService, socketService, notificationService, pointService) {
  try {
    const { taskType, description, dueDate } = task;
    if (!staffId || !taskType || !description || !dueDate) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Missing required task details');
    }

    const staff = await Staff.findByPk(staffId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: User, as: 'user' },
        { model: MerchantBranch, as: 'branch' },
      ],
    });
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Staff not found');

    // Validate task type against staff_types array
    const validTaskTypes = staff.staff_types.reduce((acc, role) => {
      const roleConstants = roleConstantsMap[role] || {};
      return [...acc, ...Object.values(roleConstants.TASK_TYPES || {}).flatMap(service => service)];
    }, []);
    if (!validTaskTypes.includes(taskType)) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Invalid task type');
    }

    // Check if staff has an active shift
    const activeShift = await Shift.findOne({
      where: {
        staff_id: staffId,
        status: 'active',
        start_time: { [Op.lte]: new Date() },
        end_time: { [Op.gte]: new Date() },
      },
    });
    if (!activeShift) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('INVALID_SHIFT') ? 'INVALID_SHIFT' : 'No active shift found');
    }

    // Validate due date (must be in the future as per Task model)
    if (new Date(dueDate) <= new Date()) {
      throw new Error('Due date must be in the future');
    }

    // Verify required certifications for the staff role
    const requiredCerts = staff.staff_types.flatMap(type => staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[type] || []);
    if (!staff.certifications || !requiredCerts.every(cert => staff.certifications.includes(cert))) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('MISSING_CERTIFICATIONS') ? 'MISSING_CERTIFICATIONS' : 'Missing required certifications');
    }

    const newTask = await Task.create({
      staff_id: staffId,
      branch_id: staff.branch_id,
      task_type: taskType,
      description,
      due_date: new Date(dueDate),
      status: staffConstants.STAFF_TASK_STATUSES[0], // ASSIGNED
    });

    await auditService.logAction({
      userId: staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'task_assignment',
      details: { staffId, taskId: newTask.id, taskType },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:taskAllocated', { staffId, taskId: newTask.id, taskType }, `staff:${staffId}`);

    await notificationService.sendNotification({
      userId: staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('task_assignment') ? 'task_assignment' : 'general',
      messageKey: 'staff.task_allocated',
      messageParams: { taskType, dueDate: new Date(dueDate) },
      role: 'staff',
      module: 'taskManagement',
      languageCode: staff.merchant?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    const points = staffConstants.STAFF_ANALYTICS_CONSTANTS.METRICS.includes('task_completion_rate') ? 10 : 0;
    await pointService.awardPoints(staff.user_id, 'task_assignment', points);

    return newTask;
  } catch (error) {
    logger.error('Error allocating task', { error: error.message });
    throw error;
  }
}

async function trackTaskProgress(taskId, io, auditService, socketService, pointService) {
  try {
    if (!taskId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Task ID required');
    }

    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Staff,
          as: 'staff',
          include: [
            { model: User, as: 'user' },
            { model: MerchantBranch, as: 'branch' },
          ],
        },
      ],
    });
    if (!task) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Task not found');

    // Check if task is delayed
    const isDelayed = task.status !== staffConstants.STAFF_TASK_STATUSES[2] && new Date() > new Date(task.due_date); // COMPLETED
    if (isDelayed && task.status !== staffConstants.STAFF_TASK_STATUSES[3]) { // DELAYED
      await task.update({ status: staffConstants.STAFF_TASK_STATUSES[3] });
    }

    await auditService.logAction({
      userId: task.staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'task_progress_update',
      details: { taskId, status: task.status },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:taskProgress', { taskId, status: task.status }, `staff:${task.staff_id}`);

    if (task.status === staffConstants.STAFF_TASK_STATUSES[2]) { // COMPLETED
      const points = staffConstants.STAFF_ANALYTICS_CONSTANTS.METRICS.includes('task_completion_rate') ? 10 : 0;
      await pointService.awardPoints(task.staff.user_id, 'task_completion', points);
    }

    return { taskId, status: task.status, isDelayed };
  } catch (error) {
    logger.error('Error tracking task progress', { error: error.message });
    throw error;
  }
}

async function notifyTaskDelays(taskId, io, auditService, socketService, notificationService, pointService) {
  try {
    if (!taskId) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Task ID required');
    }

    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Staff,
          as: 'staff',
          include: [
            { model: Merchant, as: 'merchant' },
            { model: User, as: 'user' },
            { model: MerchantBranch, as: 'branch' },
          ],
        },
      ],
    });
    if (!task) throw new Error(staffConstants.STAFF_ERROR_CODES.includes('TASK_ASSIGNMENT_FAILED') ? 'TASK_ASSIGNMENT_FAILED' : 'Task not found');

    if (task.status === staffConstants.STAFF_TASK_STATUSES[2]) { // COMPLETED
      return { status: staffConstants.SUCCESS_MESSAGES.includes('task_completed') ? 'task_completed' : 'Task already completed' };
    }

    const isDelayed = new Date() > new Date(task.due_date);
    if (!isDelayed) return { status: 'Task not delayed' };

    if (task.status !== staffConstants.STAFF_TASK_STATUSES[3]) { // DELAYED
      await task.update({ status: staffConstants.STAFF_TASK_STATUSES[3] });
    }

    const result = await notificationService.sendNotification({
      userId: task.staff.user_id,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES.includes('task_assignment') ? 'task_assignment' : 'general',
      messageKey: 'staff.task_delayed',
      messageParams: { taskType: task.task_type, dueDate: task.due_date },
      role: 'staff',
      module: 'taskManagement',
      languageCode: task.staff.merchant?.preferred_language || staffConstants.STAFF_SETTINGS.DEFAULT_LANGUAGE,
    });

    await auditService.logAction({
      userId: task.staff.user_id,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.includes('staff_profile_update') ? 'staff_profile_update' : 'task_delay_notification',
      details: { taskId, status: task.status },
      ipAddress: '127.0.0.1',
    });

    socketService.emit(io, 'staff:taskDelayNotified', { taskId, staffId: task.staff_id }, `staff:${task.staff_id}`);

    return result;
  } catch (error) {
    logger.error('Error notifying task delay', { error: error.message });
    throw error;
  }
}

module.exports = {
  allocateTask,
  trackTaskProgress,
  notifyTaskDelays,
};