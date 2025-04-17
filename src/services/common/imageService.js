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
      if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
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
        default:
          throw new AppError('Invalid image type', 400, 'INVALID_IMAGE_TYPE');
      }

      const uploadPath = path.join(uploadDir, filename);

      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(uploadPath, buffer);

      // Clean up temp file if it exists
      if (file.path) {
        await fs.unlink(file.path).catch(err => {
          logger.warn('Failed to delete temp file', { path: file.path, error: err.message });
        });
      }

      const relativePath = `/Uploads/${
        type === 'logo' ? 'logos' :
        type === 'avatar' ? 'customer' :
        type === 'banner' ? 'banners' :
        type === 'driver_profile' || type === 'driver_license' ? 'driver' :
        'staff'
      }/${filename}`;
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
      let filePath;
      if (type === 'avatar' || type === 'staff') {
        const user = await User.findByPk(entityId, {
          attributes: ['avatar_url'],
        });
        if (!user) {
          throw new AppError('User not found', 404, 'USER_NOT_FOUND');
        }
        if (!user.avatar_url) {
          logger.info('No avatar to delete', { entityId, type });
          return;
        }
        filePath = path.join(__dirname, '..', '..', user.avatar_url.replace(/^\/[Uu]ploads\//, ''));
      } else if (type === 'driver_profile' || type === 'driver_license') {
        const driver = await Driver.findOne({
          where: { user_id: entityId },
          attributes: [type === 'driver_profile' ? 'profile_picture_url' : 'license_picture_url'],
        });
        if (!driver) {
          throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
        }
        const imageUrl = type === 'driver_profile' ? driver.profile_picture_url : driver.license_picture_url;
        if (!imageUrl) {
          logger.info(`No ${type} image to delete`, { entityId, type });
          return;
        }
        filePath = path.join(__dirname, '..', '..', imageUrl.replace(/^\/[Uu]ploads\//, ''));
      } else {
        // Handle logos and banners
        filePath = path.join(__dirname, '..', '..', 'Uploads', type === 'logo' ? 'logos' : 'banners', entityId.toString());
      }

      await fs.unlink(filePath);
      logger.info('Image deleted', { entityId, type, filePath });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete image', { error: error.message, entityId, type });
        throw new AppError('Failed to delete image', 500, 'IMAGE_DELETE_FAILED', error.message);
      }
      logger.info('Image file not found, proceeding', { entityId, type });
    }
  },

  async deleteBannerImage(bannerUrl) {
    try {
      if (!bannerUrl) {
        logger.warn('No banner URL provided for deletion');
        return;
      }
      const filePath = path.join(__dirname, '..', '..', 'Uploads', bannerUrl.replace(/^\/[Uu]ploads\//, ''));
      await fs.unlink(filePath);
      logger.info('Banner image deleted', { bannerUrl });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete banner image', { error: error.message, bannerUrl });
        throw new AppError('Failed to delete banner', 500, 'BANNER_DELETE_FAILED', error.message);
      }
      logger.info('Banner file not found, proceeding', { bannerUrl });
    }
  },
};