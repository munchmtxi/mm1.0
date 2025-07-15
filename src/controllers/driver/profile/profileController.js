'use strict';

const profileService = require('@services/driver/profile/profileService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const imageService = require('@services/common/imageService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function updateProfile(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const details = req.body;
    const driver = await profileService.updateProfile(driverId, details, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: driver,
      message: formatMessage('driver', 'profile', driver.preferred_language, 'profile.updated', { driverId }),
    });
  } catch (error) {
    next(error);
  }
}

async function uploadCertification(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const certData = { file: req.file, type: req.body.type };
    const imageUrl = await profileService.uploadCertification(driverId, certData, auditService, notificationService, socketService, imageService, pointService);

    res.status(200).json({
      status: 'success',
      data: { imageUrl },
      message: formatMessage('driver', 'profile', driver.preferred_language, 'profile.certification_updated', { type: certData.type }),
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const driver = await profileService.getProfile(driverId, auditService, pointService);

    res.status(200).json({
      status: 'success',
      data: driver,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyProfile(req, res, next) {
  try {
    const driverId = req.user.driverId;
    const complianceStatus = await profileService.verifyProfile(driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: complianceStatus,
      message: formatMessage('driver', 'profile', driver.preferred_language, 'profile.verified'),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateProfile,
  uploadCertification,
  getProfile,
  verifyProfile,
};