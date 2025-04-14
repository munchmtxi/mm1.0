'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const multerConfig = require('@config/multerConfig');

module.exports = {
  /**
   * Upload an image (logo, banner, gallery).
   * @param {number} entityId
   * @param {object} file
   * @param {string} type
   * @returns {string}
   */
  async uploadImage(entityId, file, type) {
    try {
      if (!['logo', 'banner', 'gallery'].includes(type)) {
        throw new AppError('Invalid image type', 400, 'INVALID_IMAGE_TYPE');
      }

      const upload = await multerConfig.uploadSingle(file);
      const fileUrl = upload.path; // Assuming Multer returns a path or URL

      logger.logApiEvent('Image uploaded', { entityId, type });
      return fileUrl;
    } catch (error) {
      logger.logErrorEvent('Failed to upload image', { error: error.message, entityId, type });
      throw error instanceof AppError ? error : new AppError('Failed to upload image', 500, 'IMAGE_UPLOAD_FAILED');
    }
  },

  /**
   * Delete an image.
   * @param {number} entityId
   * @param {string} type
   * @returns {boolean}
   */
  async deleteImage(entityId, type) {
    try {
      if (!['logo', 'banner', 'gallery'].includes(type)) {
        throw new AppError('Invalid image type', 400, 'INVALID_IMAGE_TYPE');
      }

      await multerConfig.deleteFile(type); // Adjust based on your Multer setup
      logger.logApiEvent('Image deleted', { entityId, type });
      return true;
    } catch (error) {
      logger.logErrorEvent('Failed to delete image', { error: error.message, entityId, type });
      throw error instanceof AppError ? error : new AppError('Failed to delete image', 500, 'IMAGE_DELETION_FAILED');
    }
  },

  /**
   * Upload a banner image.
   * @param {number} entityId
   * @param {object} file
   * @param {string} type
   * @returns {string}
   */
  async uploadBannerImage(entityId, file, type) {
    try {
      if (type !== 'banner') {
        throw new AppError('Invalid banner type', 400, 'INVALID_BANNER_TYPE');
      }

      const upload = await multerConfig.uploadSingle(file);
      const fileUrl = upload.path;

      logger.logApiEvent('Banner image uploaded', { entityId });
      return fileUrl;
    } catch (error) {
      logger.logErrorEvent('Failed to upload banner image', { error: error.message, entityId });
      throw error instanceof AppError ? error : new AppError('Failed to upload banner', 500, 'BANNER_UPLOAD_FAILED');
    }
  },

  /**
   * Delete a banner image.
   * @param {string} bannerUrl
   * @returns {boolean}
   */
  async deleteBannerImage(bannerUrl) {
    try {
      await multerConfig.deleteFile(bannerUrl);
      logger.logApiEvent('Banner image deleted', { bannerUrl });
      return true;
    } catch (error) {
      logger.logErrorEvent('Failed to delete banner image', { error: error.message, bannerUrl });
      throw error instanceof AppError ? error : new AppError('Failed to delete banner', 500, 'BANNER_DELETION_FAILED');
    }
  },
};