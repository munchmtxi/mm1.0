'use strict';

const profileService = require('@services/driver/profile/profileService');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const getProfile = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const profile = await profileService.getProfile(userId);
  logger.info('Driver profile retrieved', { userId });
  res.status(200).json({ status: 'success', data: profile });
});

const updatePersonalInfo = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const updateData = req.body;
  const updatedProfile = await profileService.updatePersonalInfo(userId, updateData);
  logger.info('Driver personal info updated', { userId });
  res.status(200).json({ status: 'success', data: updatedProfile });
});

const updateVehicleInfo = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const vehicleData = req.body;
  const updatedDriver = await profileService.updateVehicleInfo(userId, vehicleData);
  logger.info('Driver vehicle info updated', { userId });
  res.status(200).json({ status: 'success', data: updatedDriver });
});

const changePassword = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;
  await profileService.changePassword(userId, currentPassword, newPassword);
  logger.info('Driver password changed', { userId });
  res.status(200).json({ status: 'success', message: 'Password changed successfully' });
});

const updateProfilePicture = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const file = req.file;
  const profilePictureUrl = await profileService.updateProfilePicture(userId, file);
  logger.info('Driver profile picture updated', { userId });
  res.status(200).json({ status: 'success', data: { profilePictureUrl } });
});

const deleteProfilePicture = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await profileService.deleteProfilePicture(userId);
  logger.info('Driver profile picture deleted', { userId });
  res.status(200).json({ status: 'success', message: 'Profile picture deleted successfully' });
});

const updateLicensePicture = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const file = req.file;
  const licensePictureUrl = await profileService.updateLicensePicture(userId, file);
  logger.info('Driver license picture updated', { userId });
  res.status(200).json({ status: 'success', data: { licensePictureUrl } });
});

const deleteLicensePicture = catchAsync(async (req, res) => {
  const userId = req.user.id;
  await profileService.deleteLicensePicture(userId);
  logger.info('Driver license picture deleted', { userId });
  res.status(200).json({ status: 'success', message: 'License picture deleted successfully' });
});

const manageAddresses = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { action, addressData } = req.body;
  const result = await profileService.manageAddresses(userId, action, addressData);
  logger.info('Driver address managed', { userId, action });
  res.status(200).json({ status: 'success', data: result });
});

module.exports = {
  getProfile,
  updatePersonalInfo,
  updateVehicleInfo,
  changePassword,
  updateProfilePicture,
  deleteProfilePicture,
  updateLicensePicture,
  deleteLicensePicture,
  manageAddresses,
};