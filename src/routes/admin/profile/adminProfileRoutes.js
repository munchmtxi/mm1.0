'use strict';

const express = require('express');
const router = express.Router();
const adminProfileController = require('@controllers/admin/profile/adminProfileController');
const adminProfileValidator = require('@validators/admin/profile/adminProfileValidator');
const adminProfileMiddleware = require('@middleware/admin/profile/adminProfileMiddleware');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const upload = require('@config/multerConfig');

router.use(authenticate, restrictTo('admin'));

router
  .route('/')
  .get(adminProfileController.getProfile)
  .patch(
    adminProfileValidator.validateUpdatePersonalInfo,
    adminProfileController.updatePersonalInfo
  );

router
  .route('/password')
  .patch(adminProfileValidator.validateChangePassword, adminProfileController.changePassword);

router
  .route('/avatar')
  .post(
    upload.single('avatar'),
    adminProfileMiddleware.validateFileUpload,
    adminProfileValidator.validateUploadPicture,
    adminProfileController.uploadProfilePicture
  )
  .delete(adminProfileController.deleteProfilePicture);

router
  .route('/availability')
  .patch(
    adminProfileValidator.validateAvailabilityStatus,
    adminProfileController.updateAvailabilityStatus
  );

module.exports = router;