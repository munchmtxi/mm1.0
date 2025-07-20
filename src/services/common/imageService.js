// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\services\imageService.js
'use strict';

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { User, Driver, Merchant } = require('@models');
const ffmpeg = require('fluent-ffmpeg');
const uploadConstants = require('@constants/common/uploadConstants');

module.exports = {
  async uploadImage(entityId, file, type, entityType = uploadConstants.ROLES.CUSTOMER, merchantType = null) {
    try {
      logger.debug('uploadImage input', {
        entityId,
        type,
        entityType,
        merchantType,
        fileExists: !!file,
        originalname: file?.originalname,
        mimetype: file?.mimetype,
        path: file?.path,
        bufferExists: !!file?.buffer,
        bufferLength: file?.buffer?.length,
      });

      if (!file || !file.originalname) {
        throw new AppError('Invalid file data', 400, uploadConstants.ERROR_CODES.INVALID_FILE_DATA);
      }

      // Validate upload type
      if (!Object.values(uploadConstants.UPLOAD_TYPES).includes(type)) {
        throw new AppError('Invalid file type', 400, uploadConstants.ERROR_CODES.INVALID_FILE_TYPE);
      }

      // Validate entity type
      if (!Object.values(uploadConstants.ROLES).includes(entityType)) {
        throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE');
      }

      // Validate merchant type if applicable
      if (entityType === uploadConstants.ROLES.MERCHANT && merchantType && !Object.values(uploadConstants.MERCHANT_TYPES).includes(merchantType)) {
        throw new AppError('Invalid merchant type', 400, 'INVALID_MERCHANT_TYPE');
      }

      let buffer;
      if (file.path) {
        try {
          buffer = await fs.readFile(file.path);
        } catch (err) {
          logger.error('Failed to read temp file', { path: file.path, error: err.message });
          throw new AppError('Failed to read uploaded file', 500, uploadConstants.ERROR_CODES.FILE_READ_FAILED);
        }
      } else if (file.buffer) {
        buffer = file.buffer;
      } else {
        throw new AppError('Invalid file data', 400, uploadConstants.ERROR_CODES.INVALID_FILE_DATA);
      }

      // Validate video duration for review_videos
      if (type === uploadConstants.UPLOAD_TYPES.REVIEW_VIDEOS) {
        const maxDuration = uploadConstants.UPLOAD_LIMITS.MAX_VIDEO_DURATION_SECONDS;
        try {
          const duration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(file.path || buffer, (err, metadata) => {
              if (err) reject(err);
              resolve(metadata.format.duration);
            });
          });
          if (duration > maxDuration) {
            throw new AppError(`Video exceeds ${maxDuration} seconds`, 400, uploadConstants.ERROR_CODES.INVALID_VIDEO_DURATION);
          }
        } catch (err) {
          logger.error('Failed to validate video duration', { error: err.message });
          throw new AppError('Failed to validate video', 500, uploadConstants.ERROR_CODES.VIDEO_VALIDATION_FAILED);
        }
      }

      // Validate file extension and MIME type
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = [
        ...uploadConstants.ALLOWED_EXTENSIONS.IMAGES,
        ...(type === uploadConstants.UPLOAD_TYPES.PROMO_VIDEO || type === uploadConstants.UPLOAD_TYPES.REVIEW_VIDEOS
          ? uploadConstants.ALLOWED_EXTENSIONS.VIDEOS
          : []),
        ...(type === uploadConstants.UPLOAD_TYPES.DOCUMENTS || type === uploadConstants.UPLOAD_TYPES.DISPUTE_DOCUMENTS
          ? uploadConstants.ALLOWED_EXTENSIONS.DOCUMENTS
          : []),
      ];
      const allowedMimeTypes = [
        ...uploadConstants.MIME_TYPES.IMAGES,
        ...(type === uploadConstants.UPLOAD_TYPES.PROMO_VIDEO || type === uploadConstants.UPLOAD_TYPES.REVIEW_VIDEOS
          ? uploadConstants.MIME_TYPES.VIDEOS
          : []),
        ...(type === uploadConstants.UPLOAD_TYPES.DOCUMENTS || type === uploadConstants.UPLOAD_TYPES.DISPUTE_DOCUMENTS
          ? uploadConstants.MIME_TYPES.DOCUMENTS
          : []),
      ];
      if (!allowedExts.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
        throw new AppError('Unsupported file format', 400, uploadConstants.ERROR_CODES.UNSUPPORTED_FILE_FORMAT);
      }

      // Generate filename and upload path
      const filename = `${type}-${entityId}-${uuidv4()}${ext}`;
      let uploadDir = uploadConstants.UPLOAD_PATHS[entityType]?.[type];
      if (!uploadDir) {
        throw new AppError('Invalid upload path for type', 400, uploadConstants.ERROR_CODES.INVALID_FILE_TYPE);
      }
      if (entityType === uploadConstants.ROLES.MERCHANT && merchantType) {
        uploadDir = uploadDir.replace('{merchantType}', merchantType);
      }
      uploadDir = path.join(__dirname, '..', '..', 'Uploads', uploadDir);
      const uploadPath = path.join(uploadDir, filename);

      // Create directory and write file
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(uploadPath, buffer);

      // Clean up temp file
      if (file.path) {
        await fs.unlink(file.path).catch(err => {
          logger.warn('Failed to delete temp file', { path: file.path, error: err.message });
        });
      }

      const relativePath = `/Uploads${uploadPath.split('Uploads')[1]}`;
      logger.info('File uploaded', { entityId, type, entityType, merchantType, path: relativePath });

      return relativePath;
    } catch (error) {
      logger.error('Failed to upload file', { error: error.message, entityId, type, entityType, merchantType });
      throw error instanceof AppError ? error : new AppError('Failed to upload file', 500, uploadConstants.ERROR_CODES.FILE_UPLOAD_FAILED);
    }
  },

  async uploadBannerImage(entityId, file, merchantType = null) {
    try {
      return await this.uploadImage(entityId, file, uploadConstants.UPLOAD_TYPES.BANNER, uploadConstants.ROLES.MERCHANT, merchantType);
    } catch (error) {
      logger.error('Failed to upload banner image', { error: error.message, entityId, merchantType });
      throw error instanceof AppError ? error : new AppError('Failed to upload banner', 500, uploadConstants.ERROR_CODES.BANNER_UPLOAD_FAILED);
    }
  },

  async deleteImage(entityId, type, entityType = uploadConstants.ROLES.CUSTOMER, merchantType = null) {
    try {
      // Validate upload type and entity type
      if (!Object.values(uploadConstants.UPLOAD_TYPES).includes(type)) {
        throw new AppError('Invalid file type', 400, uploadConstants.ERROR_CODES.INVALID_FILE_TYPE);
      }
      if (!Object.values(uploadConstants.ROLES).includes(entityType)) {
        throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE');
      }
      if (entityType === uploadConstants.ROLES.MERCHANT && merchantType && !Object.values(uploadConstants.MERCHANT_TYPES).includes(merchantType)) {
        throw new AppError('Invalid merchant type', 400, 'INVALID_MERCHANT_TYPE');
      }

      let filePath;
      if (type === uploadConstants.UPLOAD_TYPES.AVATAR) {
        if (entityType === uploadConstants.ROLES.DRIVER) {
          const driver = await Driver.findByPk(entityId, { attributes: ['profile_picture_url'] });
          if (!driver) {
            throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
          }
          if (!driver.profile_picture_url) {
            logger.info('No avatar to delete for driver', { entityId, type });
            return;
          }
          filePath = path.join(__dirname, '..', '..', driver.profile_picture_url);
        } else {
          const user = await User.findByPk(entityId, { attributes: ['avatar_url'] });
          if (!user) {
            throw new AppError('User not found', 404, 'USER_NOT_FOUND');
          }
          if (!user.avatar_url) {
            logger.info('No avatar to delete', { entityId, type });
            return;
          }
          filePath = path.join(__dirname, '..', '..', user.avatar_url);
        }
      } else if (type === uploadConstants.UPLOAD_TYPES.DRIVER_LICENSE) {
        const driver = await Driver.findByPk(entityId, { attributes: ['license_picture_url'] });
        if (!driver) {
          throw new AppError('Driver not found', 404, 'DRIVER_NOT_FOUND');
        }
        if (!driver.license_picture_url) {
          logger.info('No driver license to delete', { entityId, type });
          return;
        }
        filePath = path.join(__dirname, '..', '..', driver.license_picture_url);
      } else if ([uploadConstants.UPLOAD_TYPES.LOGO, uploadConstants.UPLOAD_TYPES.BANNER].includes(type)) {
        const merchant = await Merchant.findByPk(entityId, { attributes: [`${type}_url`] });
        if (!merchant) {
          throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
        }
        const fileUrl = merchant[`${type}_url`];
        if (!fileUrl) {
          logger.info(`No ${type} to delete for merchant`, { entityId, type });
          return;
        }
        filePath = path.join(__dirname, '..', '..', fileUrl);
      } else if ([uploadConstants.UPLOAD_TYPES.PROMO_VIDEO, uploadConstants.UPLOAD_TYPES.DOCUMENTS, uploadConstants.UPLOAD_TYPES.REVIEW_PHOTOS, uploadConstants.UPLOAD_TYPES.REVIEW_VIDEOS, uploadConstants.UPLOAD_TYPES.DISPUTE_DOCUMENTS, uploadConstants.UPLOAD_TYPES.MENU_PHOTOS].includes(type)) {
        // Assume these are stored externally or in Merchant/User custom fields
        // For simplicity, assume Merchant holds promo_video_url, documents_url, etc.
        const merchant = await Merchant.findByPk(entityId, { attributes: [`${type}_url`] });
        if (entityType === uploadConstants.ROLES.MERCHANT && merchant) {
          const fileUrl = merchant[`${type}_url`];
          if (!fileUrl) {
            logger.info(`No ${type} to delete for merchant`, { entityId, type });
            return;
          }
          filePath = path.join(__dirname, '..', '..', fileUrl);
        } else {
          // For non-merchant roles, assume external storage or custom logic
          throw new AppError(`Delete not supported for ${type} on ${entityType}`, 400, 'UNSUPPORTED_DELETE_OPERATION');
        }
      } else {
        throw new AppError('Unsupported delete type', 400, uploadConstants.ERROR_CODES.INVALID_FILE_TYPE);
      }

      await fs.unlink(filePath);
      logger.info('File deleted successfully', { filePath, entityId, type, entityType, merchantType });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete file', { error: error.message, entityId, type, entityType, merchantType });
        throw new AppError('Failed to delete file', 500, uploadConstants.ERROR_CODES.FILE_DELETE_FAILED, error.message);
      }
      logger.info('File not found, proceeding', { entityId, type, entityType, merchantType });
    }
  },
};