'use strict';

const profileService = require('@services/driver/profile/profileService');
const logger = require('@utils/logger');
const catchAsyncSocket = require('@utils/catchAsyncSocket');
const profileEvents = require('@socket/events/driver/profile/profileEvents');
const { verifySocketToken } = require('@services/common/authService');

const setupProfileHandlers = (socket, io) => {
  socket.on(
    profileEvents.DRIVER_PROFILE_UPDATED,
    catchAsyncSocket(async (data, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver profile update', { userId });
      const updatedProfile = await profileService.updatePersonalInfo(userId, data);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_PROFILE_UPDATED, updatedProfile);
      callback({ status: 'success', data: updatedProfile });
    })
  );

  socket.on(
    profileEvents.DRIVER_VEHICLE_UPDATED,
    catchAsyncSocket(async (data, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver vehicle update', { userId });
      const updatedDriver = await profileService.updateVehicleInfo(userId, data);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_VEHICLE_UPDATED, updatedDriver);
      callback({ status: 'success', data: updatedDriver });
    })
  );

  socket.on(
    profileEvents.DRIVER_PASSWORD_CHANGED,
    catchAsyncSocket(async ({ currentPassword, newPassword }, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver password change', { userId });
      await profileService.changePassword(userId, currentPassword, newPassword);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_PASSWORD_CHANGED, { message: 'Password changed successfully' });
      callback({ status: 'success', message: 'Password changed successfully' });
    })
  );

  socket.on(
    profileEvents.DRIVER_PROFILE_PICTURE_UPDATED,
    catchAsyncSocket(async (data, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver profile picture update', { userId });
      const profilePictureUrl = await profileService.updateProfilePicture(userId, data.file);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_PROFILE_PICTURE_UPDATED, { profilePictureUrl });
      callback({ status: 'success', data: { profilePictureUrl } });
    })
  );

  socket.on(
    profileEvents.DRIVER_PROFILE_PICTURE_DELETED,
    catchAsyncSocket(async (data, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver profile picture deletion', { userId });
      await profileService.deleteProfilePicture(userId);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_PROFILE_PICTURE_DELETED, { message: 'Profile picture deleted' });
      callback({ status: 'success', message: 'Profile picture deleted successfully' });
    })
  );

  socket.on(
    profileEvents.DRIVER_LICENSE_PICTURE_UPDATED,
    catchAsyncSocket(async (data, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver license picture update', { userId });
      const licensePictureUrl = await profileService.updateLicensePicture(userId, data.file);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_LICENSE_PICTURE_UPDATED, { licensePictureUrl });
      callback({ status: 'success', data: { licensePictureUrl } });
    })
  );

  socket.on(
    profileEvents.DRIVER_LICENSE_PICTURE_DELETED,
    catchAsyncSocket(async (data, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver license picture deletion', { userId });
      await profileService.deleteLicensePicture(userId);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_LICENSE_PICTURE_DELETED, { message: 'License picture deleted' });
      callback({ status: 'success', message: 'License picture deleted successfully' });
    })
  );

  socket.on(
    profileEvents.DRIVER_ADDRESS_ADDED,
    catchAsyncSocket(async ({ addressData }, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver address addition', { userId });
      const address = await profileService.manageAddresses(userId, 'add_address', addressData);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_ADDRESS_ADDED, address);
      callback({ status: 'success', data: address });
    })
  );

  socket.on(
    profileEvents.DRIVER_ADDRESS_REMOVED,
    catchAsyncSocket(async ({ addressData }, callback) => {
      const userId = await verifySocketToken(socket);
      logger.info('Handling driver address removal', { userId });
      await profileService.manageAddresses(userId, 'remove_address', addressData);
      io.to(`driver:${userId}`).emit(profileEvents.DRIVER_ADDRESS_REMOVED, { addressId: addressData.id });
      callback({ status: 'success', message: 'Address removed successfully' });
    })
  );
};

module.exports = { setupProfileHandlers };