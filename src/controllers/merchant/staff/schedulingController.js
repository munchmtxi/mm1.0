// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\merchant\staff\schedulingController.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const schedulingService = require('@services/merchant\staff\schedulingService');

async function createSchedule(req, res) {
  try {
    const { restaurantId } = req.params;
    const schedule = req.body;
    const io = req.app.get('io');
    const result = await schedulingService.createSchedule(restaurantId, schedule, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function trackTime(req, res) {
  try {
    const { staffId } = req.params;
    const timeData = req.body;
    const io = req.app.get('io');
    const result = await schedulingService.trackTime(staffId, timeData, io, auditService, socketService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function notifySchedule(req, res) {
  try {
    const { staffId, shiftId } = req.params;
    const io = req.app.get('io');
    const result = await schedulingService.notifySchedule(staffId, shiftId, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function adjustSchedule(req, res) {
  try {
    const { scheduleId } = req.params;
    const updates = req.body;
    const io = req.app.get('io');
    const result = await schedulingService.adjustSchedule(scheduleId, updates, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  createSchedule,
  trackTime,
  notifySchedule,
  adjustSchedule,
};