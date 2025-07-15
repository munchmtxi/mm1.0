'use strict';

const { Training, Staff, Verification, Badge, UserBadge } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const { formatMessage } = require('@utils/localization');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');
const { Op } = require('sequelize');

async function distributeTraining(staffId, training, ipAddress, notificationService, socketService, auditService, pointService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (!staffConstants.STAFF_TRAINING_TYPES.includes(training.category)) {
      throw new AppError('Invalid training category', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    const newTraining = await Training.create({
      staff_id: staffId,
      category: training.category,
      content: training.content,
      status: 'assigned',
    });

    await auditService.logAction({
      userId: staffId,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, trainingId: newTraining.id, action: 'distribute_training' },
      ipAddress,
    });

    const message = formatMessage('training.assigned', { trainingId: newTraining.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TRAINING_REMINDER,
      message,
      role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
      module: 'munch',
      trainingId: newTraining.id,
    });

    socketService.emit(`munch:training:${staffId}`, 'training:assigned', { staffId, trainingId: newTraining.id });

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

    return newTraining;
  } catch (error) {
    logger.error('Training distribution failed', { error: error.message, staffId });
    throw new AppError(`Training distribution failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function trackTrainingCompletion(staffId, socketService, pointService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const trainings = await Training.findAll({
      where: { staff_id: staffId },
      order: [['created_at', 'DESC']],
    });

    const progress = {
      staffId,
      trainings: trainings.map(t => ({
        trainingId: t.id,
        category: t.category,
        status: t.status,
        completedAt: t.completed_at,
      })),
    };

    socketService.emit(`munch:training:${staffId}`, 'training:progress_updated', progress);

    const completedTrainings = trainings.filter(t => t.status === 'completed');
    if (completedTrainings.length > 0) {
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

      const badge = await Badge.findOne({ where: { name: 'Training Master' } });
      if (badge) {
        await UserBadge.create({
          user_id: staff.user_id,
          badge_id: badge.id,
          awarded_at: new Date(),
        });
        socketService.emit(`munch:staff:${staffId}`, 'badge:awarded', {
          badgeName: 'Training Master',
          awardedAt: new Date(),
        });
      }
    }

    return progress;
  } catch (error) {
    logger.error('Training progress tracking failed', { error: error.message, staffId });
    throw new AppError(`Progress tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

async function assessTrainingCompliance(staffId, ipAddress, socketService, auditService) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const requiredCategories = staffConstants.STAFF_TRAINING_TYPES.filter(
      c => staffConstants.STAFF_TRAINING_CATEGORIES[c].required && staffConstants.STAFF_TRAINING_CATEGORIES[c].roles.includes(staff.position)
    );

    const completedTrainings = await Training.findAll({
      where: {
        staff_id: staffId,
        category: { [Op.in]: requiredCategories },
        status: 'completed',
      },
    });

    const compliance = {
      staffId,
      isCompliant: completedTrainings.length === requiredCategories.length,
      missing: requiredCategories.filter(c => !completedTrainings.some(t => t.category === c)),
    };

    if (compliance.isCompliant) {
      const verification = await Verification.create({
        user_id: staff.user_id,
        method: 'training_compliance',
        status: 'verified',
        document_type: 'training_certificate',
        document_url: `https://munch.com/verifications/${staffId}/training`,
      });

      await auditService.logAction({
        userId: staffId,
        role: staffConstants.STAFF_TYPES.includes(staff.position) ? staff.position : 'staff',
        action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_COMPLIANCE_VERIFY,
        details: { staffId, verificationId: verification.id, action: 'assess_compliance' },
        ipAddress,
      });
    }

    socketService.emit(`munch:training:${staffId}`, 'training:compliance_assessed', compliance);

    return compliance;
  } catch (error) {
    logger.error('Training compliance assessment failed', { error: error.message, staffId });
    throw new AppError(`Compliance assessment failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  distributeTraining,
  trackTrainingCompletion,
  assessTrainingCompliance
};