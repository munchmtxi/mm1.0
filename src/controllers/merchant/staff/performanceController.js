// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\merchant\staff\performanceController.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const performanceService = require('@services/merchant/staff/performanceService');

async function monitorMetrics(req, res) {
  try {
    const { staffId } = req.params;
    const metrics = req.body;
    const io = req.app.get('io');
    const result = await performanceService.monitorMetrics(staffId, metrics, io, auditService, socketService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function generatePerformanceReports(req, res) {
  try {
    const { staffId } = req.params;
    const options = req.body;
    const io = req.app.get('io');
    const result = await performanceService.generatePerformanceReports(staffId, options, io, auditService, socketService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function distributeTraining(req, res) {
  try {
    const { staffId } = req.params;
    const training = req.body;
    const io = req.app.get('io');
    const result = await performanceService.distributeTraining(staffId, training, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  monitorMetrics,
  generatePerformanceReports,
  distributeTraining,
};