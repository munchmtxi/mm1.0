'use strict';

/**
 * Staff Profile Controller
 * Handles HTTP requests for admin staff profile operations, interfacing with the staff profile service
 * and returning formatted responses.
 */

const staffProfileService = require('@services/admin/profile/staffProfileService');
const { STAFF_SUCCESS_MESSAGES } = require('@constants/staff/staffSystemConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const createStaff = catchAsync(async (req, res) => {
  const staff = await staffProfileService.createStaff(req.body, req.io);
  logger.info('Staff created', { staffId: staff.id });
  res.status(201).json({
    status: 'success',
    message: STAFF_SUCCESS_MESSAGES.STAFF_ONBOARDED,
    data: staff,
  });
});

const updateStaffDetails = catchAsync(async (req, res) => {
  const staff = await staffProfileService.updateStaffDetails(req.params.staffId, req.body, req.io);
  logger.info('Staff details updated', { staffId: req.params.staffId });
  res.status(200).json({
    status: 'success',
    message: 'Staff details updated successfully',
    data: staff,
  });
});

const verifyCompliance = catchAsync(async (req, res) => {
  const verificationResult = await staffProfileService.verifyCompliance(req.params.staffId, req.io);
  logger.info('Staff compliance verified', { staffId: req.params.staffId });
  res.status(200).json({
    status: 'success',
    message: 'Staff compliance verification completed',
    data: verificationResult,
  });
});

const getStaffProfile = catchAsync(async (req, res) => {
  const staff = await staffProfileService.getStaffProfile(req.params.staffId);
  logger.info('Staff profile retrieved', { staffId: req.params.staffId });
  res.status(200).json({
    status: 'success',
    message: 'Staff profile retrieved successfully',
    data: staff,
  });
});

const setCountrySettings = catchAsync(async (req, res) => {
  const staff = await staffProfileService.setCountrySettings(req.params.staffId, req.body.country, req.io);
  logger.info('Staff country settings updated', { staffId: req.params.staffId, country: req.body.country });
  res.status(200).json({
    status: 'success',
    message: 'Staff country settings updated successfully',
    data: staff,
  });
});

const manageWalletSettings = catchAsync(async (req, res) => {
  const staff = await staffProfileService.manageWalletSettings(req.params.staffId, req.params.walletId, req.body, req.io);
  logger.info('Staff wallet settings updated', { staffId: req.params.staffId, walletId: req.params.walletId });
  res.status(200).json({
    status: 'success',
    message: STAFF_SUCCESS_MESSAGES.WITHDRAWAL_REQUESTED,
    data: staff,
  });
});

module.exports = {
  createStaff,
  updateStaffDetails,
  verifyCompliance,
  getStaffProfile,
  setCountrySettings,
  manageWalletSettings,
};