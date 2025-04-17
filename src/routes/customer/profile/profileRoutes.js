'use strict';

const express = require('express');
const router = express.Router();
const profileController = require('@controllers/customer/profile/profileController');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const {
  uploadProfilePicture,
  validateFriendAction,
  validateAddressAction,
  validatePaymentAction,
} = require('@middleware/customer/profile/profileMiddleware');
const {
  updateProfile,
  changePassword,
  managePaymentMethods,
} = require('@validators/customer/profile/profileValidator');

router.use(authenticate, restrictTo('customer'));

router
  .route('/')
  .get(profileController.getProfile)
  .patch(updateProfile, profileController.updateProfile);

router.patch('/password', changePassword, profileController.changePassword);

router.post('/payment-methods', validatePaymentAction, managePaymentMethods, profileController.managePaymentMethods);
router.post('/friends', validateFriendAction, profileController.manageFriends);
router.post('/addresses', validateAddressAction, profileController.manageAddresses);

router
  .route('/profile-picture')
  .post(uploadProfilePicture, profileController.updateProfilePicture)
  .delete(profileController.deleteProfilePicture);

module.exports = router;