'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const merchantConstants = require('@constants/merchant/merchantConstants');

const mediaAuth = (permission) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(permission)(req, res, next);
    });
  });
};

const uploadMenuPhotosAuth = mediaAuth(merchantConstants.MEDIA_CONSTANTS.PERMISSIONS.UPLOAD_MENU_PHOTOS);
const managePromotionalMediaAuth = mediaAuth(merchantConstants.MEDIA_CONSTANTS.PERMISSIONS.UPLOAD_PROMOTIONAL_MEDIA);
const updateMediaMetadataAuth = mediaAuth(merchantConstants.MEDIA_CONSTANTS.PERMISSIONS.UPDATE_MEDIA_METADATA);
const deleteMediaAuth = mediaAuth(merchantConstants.MEDIA_CONSTANTS.PERMISSIONS.DELETE_MEDIA);

module.exports = {
  uploadMenuPhotosAuth,
  managePromotionalMediaAuth,
  updateMediaMetadataAuth,
  deleteMediaAuth,
};