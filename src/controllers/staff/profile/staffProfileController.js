'use strict';
const StaffProfileService = require('@services/staff/profile/staffProfileService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

exports.getProfile = catchAsync(async (req, res) => {
  const profile = await StaffProfileService.getProfile(req.user.id);
  res.status(200).json({ status: 'success', data: profile });
});

exports.updatePersonalInfo = catchAsync(async (req, res) => {
  const profile = await StaffProfileService.updatePersonalInfo(req.user.id, req.body, req.user);
  res.status(200).json({ status: 'success', data: profile });
});

exports.changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await StaffProfileService.changePassword(req.user.id, currentPassword, newPassword);
  res.status(200).json({ status: 'success', message: 'Password changed successfully' });
});

exports.uploadProfilePicture = catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
  const avatarUrl = await StaffProfileService.uploadProfilePicture(req.user.id, req.file);
  res.status(200).json({ status: 'success', data: { avatarUrl } });
});

exports.deleteProfilePicture = catchAsync(async (req, res) => {
  await StaffProfileService.deleteProfilePicture(req.user.id);
  res.status(200).json({ status: 'success', message: 'Profile picture deleted successfully' });
});