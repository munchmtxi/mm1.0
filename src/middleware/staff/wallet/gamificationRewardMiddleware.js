'use strict';

const staffConstants = require('@constants/staff/staffConstants');
const { AppError } = require('@utils/errors');
const logger = require('@utils/logger');

async function checkRewardPermission(req, res, next) {
  try {
    const { user } = req; // Assuming user is attached by auth middleware
    if (!user || !staffConstants.STAFF_PERMISSIONS.staff.includes('manage_rewards')) {
      throw new AppError('Permission denied', 403, staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }
    next();
  } catch (error) {
    logger.error('Permission check failed', { error: error.message });
    next(error);
  }
}

module.exports = {
  checkRewardPermission
};