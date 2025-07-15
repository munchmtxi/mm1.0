// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\merchant\staff\communicationController.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const communicationService = require('@services/merchant/staff/communicationService');

async function sendMessage(req, res) {
  try {
    const { staffId } = req.params;
    const message = req.body;
    const io = req.app.get('io');
    const result = await communicationService.sendMessage(staffId, message, io, auditService, socketService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function announceShift(req, res) {
  try {
    const { scheduleId } = req.params;
    const message = req.body;
    const io = req.app.get('io');
    const result = await communicationService.announceShift(scheduleId, message, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function manageChannels(req, res) {
  try {
    const { restaurantId } = req.params;
    const channel = req.body;
    const io = req.app.get('io');
    const result = await communicationService.manageChannels(restaurantId, channel, io, auditService, socketService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function trackCommunication(req, res) {
  try {
    const { staffId } = req.params;
    const io = req.app.get('io');
    const result = await communicationService.trackCommunication(staffId, io, auditService, socketService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  sendMessage,
  announceShift,
  manageChannels,
  trackCommunication,
};