'use strict';

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { User, Driver } = require('@models');

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
        bufferLength: file?.buffer?.length,
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
      const allowedExts = ['.jpg', '.jpeg', '.png', '.gif'];
      if (type === 'promo_video') {
        allowedExts.push('.mp4', '.mov');
      }
      if (!allowedExts.includes(ext)) {
        throw new AppError('Unsupported file format', 400, 'UNSUPPORTED_FILE_FORMAT');
      }

      const filename = `${type}-${entityId}-${uuidv4()}${ext}`;
      let uploadDir;
      switch (type) {
        case 'avatar':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'customer');
          break;
        case 'logo':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'logos');
          break;
        case 'banner':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'banners');
          break;
        case 'driver_profile':
        case 'driver_license':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'driver');
          break;
        case 'staff':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'staff');
          break;
        case 'admin':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'admin');
          break;
        case 'menu_photos':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'menu_photos');
          break;
        case 'promo_video':
          uploadDir = path.join(__dirname, '..', '..', 'Uploads', 'promo_videos');
          break;
        default:
          throw new AppError('Invalid image type', 400, 'INVALID_IMAGE_TYPE');
      }

      const uploadPath = path.join(uploadDir, filename);

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(uploadPath, buffer);

      if (file.path) {
        await fs.unlink(file.path).catch(err => {
          logger.warn('Failed to delete temp file', { path: file.path, error: err.message });
        });
      }

      const relativePath = `/Uploads/${path.basename(uploadDir)}/${filename}`;
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

  async deleteBannerImage(bannerUrl) {
    try {
      const filePath = path.join(__dirname, '..', '..', bannerUrl);
      await fs.unlink(filePath);
      logger.info('Banner image deleted successfully', { bannerUrl });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete banner image', { error: error.message, bannerUrl });
        throw new AppError('Failed to delete banner', 500, 'BANNER_DELETE_FAILED', error.message);
      }
      logger.info('Banner file not found, proceeding', { bannerUrl });
    }
  },

  async deleteImage(entityId, type) {
    try {
      let filePath;
      if (type === 'avatar' || type === 'staff' || type === 'admin') {
        const user = await User.findByPk(entityId, {
          attributes: ['avatar_url'],
        });
        if (!user) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (!user.avatar_url) {
          logger.info('No avatar to delete', { entityId });
          return;
        }
        filePath = path.join(__dirname, '..', '..', user.avatar_url);
      } else if (type === 'driver_profile' || type === 'driver_license') {
        const driver = await Driver.findByPk(entityId, {
          attributes: ['profile_photo', 'license_photo'],
        });
        if (!driver) {
          throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
        }
        const field = type === 'driver_profile' ? 'profile_photo' : 'license_photo';
        const fileUrl = driver[field];
        if (!fileUrl) {
          logger.info('No image to delete for driver', { entityId });
          return;
        }
        filePath = path.join(__dirname, '..', '..', fileUrl);
      } else {
        throw new AppError('Unsupported delete type', 400, 'UNSUPPORTED_DELETE_TYPE');
      }

      await fs.unlink(filePath);
      logger.info('Image deleted successfully', { filePath });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete image', { error: error.message, entityId, type });
        throw new AppError('Failed to delete image', 500, 'IMAGE_DELETE_FAILED', error.message);
      }
      logger.info('Image file not found, proceeding', { entityId, type });
    }
  },
};
