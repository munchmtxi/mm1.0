// AdminProfileController.js
'use strict';

const adminProfileService = require('@services/admin/profile/adminProfileService');
const adminConstants = require('@constants/admin/adminConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

class AdminProfileController {
  /**
   * Get admin profile
   */
  getProfile = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const profile = await adminProfileService.getProfile(userId);
    logger.info('Admin profile retrieved', { userId });
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  });

  /**
   * Update admin personal information
   */
  updatePersonalInfo = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;
    const profile = await adminProfileService.updatePersonalInfo(userId, updateData, req.user);
    logger.info('Admin profile updated', { userId });
    res.status(200).json({
      status: 'success',
      data: profile,
    });
  });

  /**
   * Change admin password
   */
  changePassword = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    await adminProfileService.changePassword(userId, currentPassword, newPassword);
    logger.info('Admin password changed', { userId });
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
    });
  });

  /**
   * Upload admin profile picture
   */
  uploadProfilePicture = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const file = req.file;
    if (!file) {
      throw new AppError('No file uploaded', 400, adminConstants.ERROR_CODES.NO_FILE_UPLOADED);
    }
    const avatarUrl = await adminProfileService.uploadProfilePicture(userId, file);
    logger.info('Admin profile picture uploaded', { userId });
    res.status(200).json({
      status: 'success',
      data: { avatar_url: avatarUrl },
    });
  });

  /**
   * Delete admin profile picture
   */
  deleteProfilePicture = catchAsync(async (req, res) => {
    const userId = req.user.id;
    await adminProfileService.deleteProfilePicture(userId);
    logger.info('Admin profile picture deleted', { userId });
    res.status(200).json({
      status: 'success',
      message: 'Profile picture deleted successfully',
    });
  });

  /**
   * Update admin availability status
   */
  updateAvailabilityStatus = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { status } = req.body;
    const updatedStatus = await adminProfileService.updateAvailabilityStatus(userId, status, req.user);
    logger.info('Admin availability status updated', { userId, status });
    res.status(200).json({
      status: 'success',
      data: { availability_status: updatedStatus },
    });
  });
}

module.exports = new AdminProfileController();
