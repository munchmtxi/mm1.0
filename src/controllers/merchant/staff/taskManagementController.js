// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\merchant\staff\taskManagementController.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const taskManagementService = require('@services/merchant/staff/taskManagementService');

async function allocateTask(req, res) {
  try {
    const { staffId } = req.params;
    const task = req.body;
    const io = req.app.get('io');
    const result = await taskManagementService.allocateTask(staffId, task, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function trackTaskProgress(req, res) {
  try {
    const { taskId } = req.params;
    const io = req.app.get('io');
    const result = await taskManagementService.trackTaskProgress(taskId, io, auditService, socketService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function notifyTaskDelays(req, res) {
  try {
    const { taskId } = req.params;
    const io = req.app.get('io');
    const result = await taskManagementService.notifyTaskDelays(taskId, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  allocateTask,
  trackTaskProgress,
  notifyTaskDelays,
};