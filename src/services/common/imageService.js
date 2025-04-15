'use strict';

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

module.exports = {
  async uploadImage(entityId, file, type) {
    try {
      logger.debug('uploadImage input', {
        entityId,
        type,
        fileExists: !!file,
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        path: file?.path,
        bufferExists: !!file?.buffer,
        bufferLength: file?.buffer?.length
      });

      if (!file || !file.originalname) {
        throw new AppError('Invalid file data', 400, 'INVALID_FILE_DATA');
      }

      let buffer;
      if (file.path) {
        try {
          buffer = await fs.readFile(file.path);
        } catch (err) {
          logger.error('Failed to read temp file', { path: file.path, error: err.message });
          throw new AppError('Failed to read uploaded file', 500, 'FILE_READ_FAILED');
        }
      } else if (file.buffer) {
        buffer = file.buffer;
      } else {
        throw new AppError('Invalid file data', 400, 'INVALID_FILE_DATA');
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
        throw new AppError('Unsupported file format', 400, 'UNSUPPORTED_FILE_FORMAT');
      }

      const filename = `${type}-${entityId}-${uuidv4()}${ext}`;
      const uploadDir = path.join(__dirname, '..', '..', 'Uploads', type === 'logo' ? 'logos' : 'banners');
      const uploadPath = path.join(uploadDir, filename);

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(uploadPath, buffer);

      // Clean up temp file if it exists
      if (file.path) {
        await fs.unlink(file.path).catch(err => {
          logger.warn('Failed to delete temp file', { path: file.path, error: err.message });
        });
      }

      const relativePath = `/Uploads/${type === 'logo' ? 'logos' : 'banners'}/${filename}`;
      logger.info('Image uploaded', { entityId, type, path: relativePath });
      return relativePath;
    } catch (error) {
      logger.error('Failed to upload image', { error: error.message, entityId, type });
      throw error instanceof AppError ? error : new AppError('Failed to upload image', 500, 'IMAGE_UPLOAD_FAILED');
    }
  },

  async uploadBannerImage(entityId, file, type) {
    try {
      return await this.uploadImage(entityId, file, type);
    } catch (error) {
      logger.error('Failed to upload banner image', { error: error.message, entityId, type });
      throw error instanceof AppError ? error : new AppError('Failed to upload banner', 500, 'BANNER_UPLOAD_FAILED');
    }
  },

  async deleteImage(entityId, type) {
    try {
      const filePath = path.join(__dirname, '..', '..', 'Uploads', type === 'logo' ? 'logos' : 'banners', entityId);
      await fs.unlink(filePath);
      logger.info('Image deleted', { entityId, type });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete image', { error: error.message, entityId, type });
        throw new AppError('Failed to delete image', 500, 'IMAGE_DELETE_FAILED');
      }
    }
  },

  async deleteBannerImage(bannerUrl) {
    try {
      if (!bannerUrl) {
        logger.warn('No banner URL provided for deletion');
        return;
      }
      const filePath = path.join(__dirname, '..', '..', 'Uploads', bannerUrl.replace(/^\/Uploads\//, ''));
      await fs.unlink(filePath);
      logger.info('Banner image deleted', { bannerUrl });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete banner image', { error: error.message, bannerUrl });
        throw new AppError('Failed to delete banner', 500, 'BANNER_DELETE_FAILED');
      }
    }
  }
};