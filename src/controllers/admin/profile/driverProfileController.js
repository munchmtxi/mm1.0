'use strict';

/**
 * Driver Profile Controller
 * Handles HTTP requests for admin driver profile operations, interfacing with the driver profile service
 * and returning formatted responses.
 */

const driverProfileService = require('@services/admin/profile/driverProfileService');
const { SUCCESS_MESSAGES } = require('@constants/driver/driverConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const createDriver = catchAsync(async (req, res) => {
  const driver = await driverProfileService.createDriver(req.body, req.io);
  logger.info('Driver created', { driverId: driver.id });
  res.status(201).json({
    status: 'success',
    message: SUCCESS_MESSAGES.DRIVER_REGISTERED,
    data: driver,
  });
});

const updateProfile = catchAsync(async (req, res) => {
  const driver = await driverProfileService.updateProfile(req.params.driverId, req.body, req.io);
  logger.info('Driver profile updated', { driverId: req.params.driverId });
  res.status(200).json({
    status: 'success',
    message: 'Driver profile updated successfully',
    data: driver,
  });
});

const uploadCertification = catchAsync(async (req, res) => {
  const driver = await driverProfileService.uploadCertification(req.params.driverId, req.body, req.io);
  logger.info('Driver certification uploaded', { driverId: req.params.driverId });
  res.status(200).json({
    status: 'success',
    message: 'Driver certification uploaded successfully',
    data: driver,
  });
});

const verifyProfile = catchAsync(async (req, res) => {
  const verificationResult = await driverProfileService.verifyProfile(req.params.driverId, req.io);
  logger.info('Driver profile verified', { driverId: req.params.driverId });
  res.status(200).json({
    status: 'success',
    message: 'Driver profile verification completed',
    data: verificationResult,
  });
});

const setCountry = catchAsync(async (req, res) => {
  const driver = await driverProfileService.setCountry(req.params.driverId, req.body.country, req.io);
  logger.info('Driver country set', { driverId: req.params.driverId, country: req.body.country });
  res.status(200).json({
    status: 'success',
    message: 'Driver country updated successfully',
    data: driver,
  });
});

const manageWalletSettings = catchAsync(async (req, res) => {
  const driver = await driverProfileService.manageWalletSettings(req.params.driverId, req.params.walletId, req.body, req.io);
  logger.info('Driver wallet settings updated', { driverId: req.params.driverId, walletId: req.params.walletId });
  res.status(200).json({
    status: 'success',
    message: 'Driver wallet settings updated successfully',
    data: driver,
  });
});

module.exports = {
  createDriver,
  updateProfile,
  uploadCertification,
  verifyProfile,
  setCountry,
  manageWalletSettings,
};