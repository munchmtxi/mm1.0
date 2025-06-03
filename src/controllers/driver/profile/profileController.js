'use strict';

/**
 * Driver Profile Controller
 * Manages HTTP requests for driver profile operations, including updates, certification uploads,
 * profile retrieval, and verification. Integrates with profileService.js for business logic.
 *
 * Last Updated: May 16, 2025
 */

const profileService = require('@services/driver/profile/profileService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const driverConstants = require('@constants/driverConstants');
const catchAsync = require('@utils/catchAsync');

/**
 * Updates driver profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const updateProfile = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const details = req.body;

  const driver = await profileService.updateProfile(driverId, details);
  logger.info('Driver profile updated via HTTP', { driverId });

  res.status(200).json({
    status: 'success',
    message: driverConstants.SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: { driver },
  });
});

/**
 * Uploads driver certification.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const uploadCertification = catchAsync(async (req, res) => {
  const { driverId } = req.params;
  const { type } = req.body;
  const file = req.file;

  if (!file || !type) {
    throw new AppError(
      'Missing file or certification type',
      400,
      driverConstants.ERROR_CODES.INVALID_FILE_DATA
    );
  }

  const imageUrl = await profileService.uploadCertification(driverId, { file, type });
  logger.info('Driver certification uploaded via HTTP', { driverId, type });

  res.status(200).json({
    status: 'success',
    message: driverConstants.SUCCESS_MESSAGES.CERTIFICATION_UPLOADED,
    data: { imageUrl },
  });
});

/**
 * Retrieves driver profile.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getProfile = catchAsync(async (req, res) => {
  const { driverId } = req.params;

  const driver = await profileService.getProfile(driverId);
  logger.info('Driver profile retrieved via HTTP', { driverId });

  res.status(200).json({
    status: 'success',
    message: driverConstants.SUCCESS_MESSAGES.PROFILE_RETRIEVED,
    data: { driver },
  });
});

/**
 * Verifies driver profile compliance.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const verifyProfile = catchAsync(async (req, res) => {
  const { driverId } = req.params;

  const complianceStatus = await profileService.verifyProfile(driverId);
  logger.info('Driver profile verified via HTTP', { driverId });

  res.status(200).json({
    status: 'success',
    message: driverConstants.SUCCESS_MESSAGES.PROFILE_VERIFIED,
    data: { complianceStatus },
  });
});

module.exports = {
  updateProfile,
  uploadCertification,
  getProfile,
  verifyProfile,
};