'use strict';

const express = require('express');
const router = express.Router();
const profileController = require('@controllers/driver/profile/profileController');
const profileMiddleware = require('@middleware/driver/profile/profileMiddleware');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const authConstants = require('@constants/common/authConstants');
const upload = require('@config/multerConfig');

router.use(authenticate, restrictTo(authConstants.ROLES.DRIVER));

router.get('/', profileController.getProfile);
router.patch('/personal-info', profileMiddleware.validatePersonalInfo, profileController.updatePersonalInfo);
router.patch('/vehicle-info', profileMiddleware.validateVehicleInfo, profileController.updateVehicleInfo);
router.patch('/password', profileMiddleware.validatePasswordChange, profileController.changePassword);
router.patch(
  '/profile-picture',
  upload.single('profilePicture'),
  profileMiddleware.validateProfilePicture,
  profileController.updateProfilePicture
);
router.delete('/profile-picture', profileController.deleteProfilePicture);
router.patch(
  '/license-picture',
  upload.single('licensePicture'),
  profileMiddleware.validateLicensePicture,
  profileController.updateLicensePicture
);
router.delete('/license-picture', profileController.deleteLicensePicture);
router.post(
  '/addresses',
  profileMiddleware.validateAddressAction,
  require('@middleware/common/verifyAddressOwnership'),
  profileController.manageAddresses
);

module.exports = router;