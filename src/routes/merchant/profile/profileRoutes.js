'use strict';

const express = require('express');
const router = express.Router();
const merchantProfileController = require('@controllers/merchant/profile/merchantProfileController');
const profileMiddleware = require('@middleware/merchant/profile/profileMiddleware');
const upload = require('@config/multerConfig');

router.use(profileMiddleware.protect, profileMiddleware.verifyMerchantProfile);

router
  .route('/profile')
  .get(profileMiddleware.validate('getProfile'), merchantProfileController.getProfile)
  .patch(profileMiddleware.validate('updateProfile'), merchantProfileController.updateProfile);

router
  .route('/profile/notifications')
  .patch(profileMiddleware.validate('updateNotificationPreferences'), merchantProfileController.updateNotificationPreferences);

router
  .route('/profile/password')
  .patch(profileMiddleware.validate('changePassword'), merchantProfileController.changePassword);

router
  .route('/profile/geolocation')
  .patch(profileMiddleware.validate('updateGeolocation'), merchantProfileController.updateGeolocation);

router
  .route('/profile/media')
  .patch(
    upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
    profileMiddleware.validate('updateMerchantMedia'),
    merchantProfileController.updateMerchantMedia
  );

router
  .route('/branches')
  .get(profileMiddleware.validate('listBranchProfiles'), merchantProfileController.listBranchProfiles)
  .post(
    upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
    profileMiddleware.validate('createBranchProfile'),
    merchantProfileController.createBranchProfile
  );

router
  .route('/branches/bulk')
  .patch(
    profileMiddleware.validate('bulkUpdateBranches'),
    profileMiddleware.verifyBulkBranches,
    merchantProfileController.bulkUpdateBranches
  );

router
  .route('/branches/:branchId')
  .get(
    profileMiddleware.validate('getBranchProfile'),
    profileMiddleware.verifyBranchOwnership,
    merchantProfileController.getBranchProfile
  )
  .patch(
    upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'banner', maxCount: 1 }]),
    profileMiddleware.validate('updateBranchProfile'),
    profileMiddleware.verifyBranchOwnership,
    merchantProfileController.updateBranchProfile
  )
  .delete(
    profileMiddleware.validate('deleteBranchProfile'),
    profileMiddleware.verifyBranchOwnership,
    merchantProfileController.deleteBranchProfile
  );

router
  .route('/places/:placeId')
  .get(profileMiddleware.validate('getPlaceDetails'), merchantProfileController.getPlaceDetails);

router
  .route('/places/predictions')
  .get(profileMiddleware.validate('getAddressPredictions'), merchantProfileController.getAddressPredictions);

module.exports = router;