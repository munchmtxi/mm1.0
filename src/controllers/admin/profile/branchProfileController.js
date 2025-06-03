'use strict';

/**
 * Branch Profile Controller
 * Handles HTTP requests for admin branch profile operations, interfacing with the branch profile service
 * and returning formatted responses.
 */

const branchProfileService = require('@services/admin/profile/branchProfileService');
const { SUCCESS_MESSAGES } = require('@constants/merchant/merchantConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const createBranch = catchAsync(async (req, res) => {
  const branch = await branchProfileService.createBranch(req.body, req.io);
  logger.info('Branch created', { branchId: branch.id });
  res.status(201).json({
    status: 'success',
    message: SUCCESS_MESSAGES.MERCHANT_CREATED,
    data: branch,
  });
});

const updateBranchDetails = catchAsync(async (req, res) => {
  const branch = await branchProfileService.updateBranchDetails(req.params.branchId, req.body, req.io);
  logger.info('Branch details updated', { branchId: req.params.branchId });
  res.status(200).json({
    status: 'success',
    message: 'Branch updated successfully',
    data: branch,
  });
});

const setGeofence = catchAsync(async (req, res) => {
  const branch = await branchProfileService.setGeofence(req.params.branchId, req.body, req.io);
  logger.info('Geofence set', { branchId: req.params.branchId });
  res.status(200).json({
    status: 'success',
    message: 'Geofence updated successfully',
    data: branch,
  });
});

const setOperatingHours = catchAsync(async (req, res) => {
  const branch = await branchProfileService.setOperatingHours(req.params.branchId, req.body, req.io);
  logger.info('Operating hours set', { branchId: req.params.branchId });
  res.status(200).json({
    status: 'success',
    message: 'Operating hours updated successfully',
    data: branch,
  });
});

const uploadMedia = catchAsync(async (req, res) => {
  const branch = await branchProfileService.uploadMedia(req.params.branchId, req.body, req.io);
  logger.info('Media uploaded', { branchId: req.params.branchId });
  res.status(200).json({
    status: 'success',
    message: 'Media uploaded successfully',
    data: branch,
  });
});

module.exports = {
  createBranch,
  updateBranchDetails,
  setGeofence,
  setOperatingHours,
  uploadMedia,
};