'use strict';

/**
 * trainingService.js
 * Manages staff training for munch (staff role). Distributes training, tracks progress,
 * verifies compliance, and awards points.
 * Last Updated: May 26, 2025
 */

const { Training, Staff, Verification, GamificationPoints, Badge, UserBadge } = require('@models');
const staffConstants = require('@constants/staff/staffSystemConstants');
const staffRolesConstants = require('@constants/staff/staffRolesConstants');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const pointService = require('@services/common/pointService');
const localization = require('@services/common/localization');
const auditService = require('@services/common/auditService');
const securityService = require('@services/common/securityService');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

/**
 * Shares role-specific training with staff.
 * @param {number} staffId - Staff ID.
 * @param {Object} training - Training details (category, content).
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Assigned training.
 */
async function distributeTraining(staffId, training, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (!Object.keys(staffRolesConstants.STAFF_TRAINING_CATEGORIES).includes(training.category)) {
      throw new AppError('Invalid training category', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    if (!staffRolesConstants.STAFF_TRAINING_CATEGORIES[training.category].roles.includes(staff.position)) {
      throw new AppError('Training not applicable to role', 400, staffConstants.STAFF_ERROR_CODES.ERROR);
    }

    const newTraining = await Training.create({
      staff_id: staffId,
      category: training.category,
      content: training.content,
      status: 'assigned',
    });

    await auditService.logAction({
      userId: staffId,
      role: 'staff',
      action: staffConstants.STAFF_AUDIT_ACTIONS.STAFF_PROFILE_UPDATE,
      details: { staffId, trainingId: newTraining.id, action: 'distribute_training' },
      ipAddress,
    });

    const message = localization.formatMessage('training.assigned', { trainingId: newTraining.id });
    await notificationService.sendNotification({
      userId: staffId,
      notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.TRAINING_REMINDER,
      message,
      role: 'staff',
      module: 'munch',
      trainingId: newTraining.id,
    });

    socketService.emit(`munch:training:${staffId}`, 'training:assigned', { staffId, trainingId: newTraining.id });

    return newTraining;
  } catch (error) {
    logger.error('Training distribution failed', { error: error.message, staffId });
    throw new AppError(`Training distribution failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Monitors training progress.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<Object>} Training progress.
 */
async function trackTrainingCompletion(staffId) {
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

    return progress;
  } catch (error) {
    logger.error('Training progress tracking failed', { error: error.message, staffId });
    throw new AppError(`Progress tracking failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

/**
 * Verifies regulatory compliance for staff training.
 * @param {number} staffId - Staff ID.
 * @param {string} ipAddress - Request IP address.
 * @returns {Promise<Object>} Compliance status.
 */
async function assessTrainingCompliance(staffId, ipAddress) {
  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const requiredCategories = Object.values(staffRolesConstants.STAFF_TRAINING_CATEGORIES)
      .filter(c => c.required && c.roles.includes(staff.position))
      .map(c => c.id);

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
        role: 'staff',
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

/**
 * Awards training completion points.
 * @param {number} staffId - Staff ID.
 * @returns {Promise<void>}
 */
async function awardTrainingPoints(staffId) {
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

    const badge = await Badge.findOne({ where: { name: 'Training Master' } });
    if (badge) {
      await UserBadge.create({
        user_id: staff.user_id,
        badge_id: badge.id,
        awarded_at: new Date(),
      });
    }

    socketService.emit(`munch:staff:${staffId}`, 'points:awarded', {
      action,
      points: staffRolesConstants.STAFF_GAMIFICATION_CONSTANTS.STAFF_ACTIONS.TASK_COMPLETION.points,
    });
  } catch (error) {
    logger.error('Training points award failed', { error: error.message, staffId });
    throw new AppError(`Points award failed: ${error.message}`, 500, staffConstants.STAFF_ERROR_CODES.ERROR);
  }
}

module.exports = {
  distributeTraining,
  trackTrainingCompletion,
  assessTrainingCompliance,
  awardTrainingPoints,
};