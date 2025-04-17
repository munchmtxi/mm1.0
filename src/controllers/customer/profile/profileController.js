'use strict';

const profileService = require('@services/customer/profile/profileService');
const profileEvents = require('@socket/events/customer/profile/profileEvents');
const { PROFILE } = require('@constants/customer/profileConstants');
const catchAsync = require('@utils/catchAsync');

const getProfile = catchAsync(async (req, res, next) => {
  const profile = await profileService.getProfile(req.user.id);
  res.status(200).json({
    status: 'success',
    data: profile,
  });
});

const updateProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const updates = req.body;
  const updatedProfile = await profileService.updateProfile(userId, updates);
  res.status(200).json({
    status: 'success',
    data: updatedProfile,
  });
  profileEvents.emitProfileUpdated(req.io, userId, Object.keys(updates));
});

const changePassword = catchAsync(async (req, res, next) => {
  await profileService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
  });
});

const managePaymentMethods = catchAsync(async (req, res, next) => {
  const paymentMethods = await profileService.managePaymentMethods(req.user.id, req.body.action, req.body.paymentMethod);
  res.status(200).json({
    status: 'success',
    data: paymentMethods,
  });
});

const manageFriends = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { action, friendId } = req.body;
  const updatedConnections = await profileService.manageFriends(userId, action, friendId);
  res.status(200).json({
    status: 'success',
    data: updatedConnections,
  });

  if (action === PROFILE.ACTIONS.FRIEND.ADD) {
    profileEvents.emitFriendRequestSent(req.io, userId, friendId);
  } else if (action === PROFILE.ACTIONS.FRIEND.ACCEPT) {
    profileEvents.emitFriendRequestAccepted(req.io, userId, friendId);
  } else if (action === PROFILE.ACTIONS.FRIEND.REJECT) {
    profileEvents.emitFriendRequestRejected(req.io, userId, friendId);
  } else if (action === PROFILE.ACTIONS.FRIEND.REMOVE) {
    profileEvents.emitFriendRemoved(req.io, userId, friendId);
  } else if (action === PROFILE.ACTIONS.FRIEND.BLOCK) {
    profileEvents.emitFriendBlocked(req.io, userId, friendId);
  }
});

const manageAddresses = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { action, addressData } = req.body;
  const savedAddresses = await profileService.manageAddresses(userId, action, addressData);
  res.status(200).json({
    status: 'success',
    data: savedAddresses,
  });
  profileEvents.emitAddressUpdated(req.io, userId, action);
});

const updateProfilePicture = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const avatarUrl = await profileService.updateProfilePicture(userId, req.file);
  res.status(200).json({
    status: 'success',
    data: { avatarUrl },
  });
  profileEvents.emitProfilePictureUpdated(req.io, userId, avatarUrl);
});

const deleteProfilePicture = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  await profileService.deleteProfilePicture(userId);
  res.status(200).json({
    status: 'success',
    message: 'Profile picture deleted successfully',
  });
  profileEvents.emitProfilePictureDeleted(req.io, userId);
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  managePaymentMethods,
  manageFriends,
  manageAddresses,
  updateProfilePicture,
  deleteProfilePicture,
};