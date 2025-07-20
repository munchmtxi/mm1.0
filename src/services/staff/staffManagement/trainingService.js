'use strict';

const { Training, Staff, Merchant } = require('@models');
const staffConstants = require('@constants/staff/staffConstants');
const stockClerkConstants = require('@constants/staff/stockClerkConstants');
const managerConstants = require('@constants/staff/managerConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const driverConstants = require('@constants/staff/driverConstants');
const chefConstants = require('@constants/staff/chefConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');

async function markTrainingAsComplete(staffId, trainingId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const training = await Training.findByPk(trainingId, { where: { staff_id: staffId } });
    if (!training) {
      throw new AppError('Training not found or not assigned to staff', 404, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const roleConstants = {
      stock_clerk: stockClerkConstants,
      manager: managerConstants,
      front_of_house: frontOfHouseConstants,
      driver: driverConstants,
      chef: chefConstants,
      cashier: cashierConstants,
      car_park_operative: carParkOperativeConstants,
      butcher: butcherConstants,
      barista: baristaConstants,
      back_of_house: backOfHouseConstants,
    };

    const staffRole = staff.staff_types[0];
    const roleConfig = roleConstants[staffRole];
    if (!roleConfig) {
      throw new AppError('Invalid staff role', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    if (!roleConfig.TRAINING_MODULES.includes(training.category)) {
      throw new AppError('Training category not authorized for role', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (!merchantConstants.MERCHANT_TYPES.includes(staff.merchant.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    if (training.status === 'completed') {
      throw new AppError('Training already completed', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    await training.update({ status: 'completed' });

    return {
      staffId,
      trainingId,
      category: training.category,
      status: training.status,
      completedAt: training.completed_at,
    };
  } catch (error) {
    logger.error('Mark training as complete failed', { error: error.message, staffId, trainingId });
    throw handleServiceError('markTrainingAsComplete', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

async function accessTrainingModule(staffId, trainingId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const training = await Training.findByPk(trainingId, { where: { staff_id: staffId } });
    if (!training) {
      throw new AppError('Training not found or not assigned to staff', 404, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    const roleConstants = {
      stock_clerk: stockClerkConstants,
      manager: managerConstants,
      front_of_house: frontOfHouseConstants,
      driver: driverConstants,
      chef: chefConstants,
      cashier: cashierConstants,
      car_park_operative: carParkOperativeConstants,
      butcher: butcherConstants,
      barista: baristaConstants,
      back_of_house: backOfHouseConstants,
    };

    const staffRole = staff.staff_types[0];
    const roleConfig = roleConstants[staffRole];
    if (!roleConfig) {
      throw new AppError('Invalid staff role', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    if (!roleConfig.TRAINING_MODULES.includes(training.category)) {
      throw new AppError('Training category not authorized for role', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    if (!merchantConstants.MERCHANT_TYPES.includes(staff.merchant.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    if (training.status !== 'assigned' && training.status !== 'in_progress') {
      throw new AppError('Training module not accessible', 400, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
    }

    return {
      staffId,
      trainingId,
      category: training.category,
      content: training.content,
      status: training.status,
    };
  } catch (error) {
    logger.error('Access training module failed', { error: error.message, staffId, trainingId });
    throw handleServiceError('accessTrainingModule', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

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

    return progress;
  } catch (error) {
    logger.error('Training progress tracking failed', { error: error.message, staffId });
    throw handleServiceError('trackTrainingCompletion', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

async function assessTrainingCompliance(staffId) {
  try {
    const staff = await Staff.findByPk(staffId, { include: [{ model: Merchant, as: 'merchant' }] });
    if (!staff) {
      throw new AppError('Staff not found', 404, staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const roleConstants = {
      stock_clerk: stockClerkConstants,
      manager: managerConstants,
      front_of_house: frontOfHouseConstants,
      driver: driverConstants,
      chef: chefConstants,
      cashier: cashierConstants,
      car_park_operative: carParkOperativeConstants,
      butcher: butcherConstants,
      barista: baristaConstants,
      back_of_house: backOfHouseConstants,
    };

    const staffRole = staff.staff_types[0];
    const roleConfig = roleConstants[staffRole];
    if (!roleConfig) {
      throw new AppError('Invalid staff role', 400, staffConstants.STAFF_ERROR_CODES.INVALID_STAFF_TYPE);
    }

    const requiredCertifications = staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS[staffRole] || [];
    const completedTrainings = await Training.find juruall({
      where: {
        staff_id: staffId,
        category: { [Op.in]: requiredCertifications },
        status: 'completed',
      },
    });

    const compliance = {
      staffId,
      isCompliant: completedTrainings.length === requiredCertifications.length,
      missing: requiredCertifications.filter(c => !completedTrainings.some(t => t.category === c)),
    };

    return compliance;
  } catch (error) {
    logger.error('Training compliance assessment failed', { error: error.message, staffId });
    throw handleServiceError('assessTrainingCompliance', error, staffConstants.STAFF_ERROR_CODES.TASK_ASSIGNMENT_FAILED);
  }
}

module.exports = {
  markTrainingAsComplete,
  accessTrainingModule,
  trackTrainingCompletion,
  assessTrainingCompliance,
};