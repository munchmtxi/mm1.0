'use strict';
const StaffProfileService = require('@services/staff/profile/staffProfileService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports = (socket, io) => {
  /**
   * Get staff profile
   */
  socket.on('staff:profile:get', async (callback) => {
    try {
      const profile = await StaffProfileService.getProfile(socket.user.id);
      callback({ status: 'success', data: profile });
    } catch (error) {
      logger.error('Socket staff profile get error', { error: error.message, userId: socket.user.id });
      callback({ status: 'error', message: error.message });
    }
  });

  /**
   * Update staff personal information
   */
  socket.on('staff:profile:update', async (updateData, callback) => {
    try {
      const profile = await StaffProfileService.updatePersonalInfo(socket.user.id, updateData, socket.user);
      // Notify merchant of profile update
      io.to(`merchant:${socket.user.merchant_id}`).emit('staff:profile:updated', {
        userId: socket.user.id,
        updatedFields: Object.keys(updateData),
      });
      callback({ status: 'success', data: profile });
    } catch (error) {
      logger.error('Socket staff profile update error', { error: error.message, userId: socket.user.id });
      callback({ status: 'error', message: error.message });
    }
  });

  /**
   * Change staff password
   */
  socket.on('staff:password:change', async ({ currentPassword, newPassword }, callback) => {
    try {
      await StaffProfileService.changePassword(socket.user.id, currentPassword, newPassword);
      // Notify merchant of password change
      io.to(`merchant:${socket.user.merchant_id}`).emit('staff:password:changed', {
        userId: socket.user.id,
      });
      callback({ status: 'success', message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Socket staff password change error', { error: error.message, userId: socket.user.id });
      callback({ status: 'error', message: error.message });
    }
  });

  /**
   * Upload staff profile picture
   */
  socket.on('staff:profile:picture:upload', async (file, callback) => {
    try {
      if (!file) throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
      const avatarUrl = await StaffProfileService.uploadProfilePicture(socket.user.id, file);
      // Notify merchant of picture upload
      io.to(`merchant:${socket.user.merchant_id}`).emit('staff:profile:picture:uploaded', {
        userId: socket.user.id,
        avatarUrl,
      });
      callback({ status: 'success', data: { avatarUrl } });
    } catch (error) {
      logger.error('Socket staff profile picture upload error', { error: error.message, userId: socket.user.id });
      callback({ status: 'error', message: error.message });
    }
  });

  /**
   * Delete staff profile picture
   */
  socket.on('staff:profile:picture:delete', async (callback) => {
    try {
      await StaffProfileService.deleteProfilePicture(socket.user.id);
      // Notify merchant of picture deletion
      io.to(`merchant:${socket.user.merchant_id}`).emit('staff:profile:picture:deleted', {
        userId: socket.user.id,
      });
      callback({ status: 'success', message: 'Profile picture deleted successfully' });
    } catch (error) {
      logger.error('Socket staff profile picture delete error', { error: error.message, userId: socket.user.id });
      callback({ status: 'error', message: error.message });
    }
  });
};