'use strict';

const trainingService = require('@services/staff/staffManagement/trainingService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function distributeTraining(req, res, next) {
  try {
    const { staffId, training } = req.body;
    const ipAddress = req.ip;
    const newTraining = await trainingService.distributeTraining(staffId, training, ipAddress, notificationService, socketService, auditService, pointService);
    return res.status(201).json({
      success: true,
      data: newTraining,
      message: 'Training assigned successfully'
    });
  } catch (error) {
    logger.error('Training distribution failed', { error: error.message });
    next(error);
  }
}

async function trackTrainingCompletion(req, res, next) {
  try {
    const { staffId } = req.params;
    const progress = await trainingService.trackTrainingCompletion(staffId, socketService, pointService);
    return res.status(200).json({
      success: true,
      data: progress,
      message: 'Training progress retrieved successfully'
    });
  } catch (error) {
    logger.error('Training progress tracking failed', { error: error.message });
    next(error);
  }
}

async function assessTrainingCompliance(req, res, next) {
  try {
    const { staffId } = req.params;
    const ipAddress = req.ip;
    const compliance = await trainingService.assessTrainingCompliance(staffId, ipAddress, socketService, auditService);
    return res.status(200).json({
      success: true,
      data: compliance,
      message: 'Training compliance assessed successfully'
    });
  } catch (error) {
    logger.error('Training compliance assessment failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  distributeTraining,
  trackTrainingCompletion,
  assessTrainingCompliance
};