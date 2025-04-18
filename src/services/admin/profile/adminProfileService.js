'use strict';

const { User, admin } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const imageService = require('@services/common/ImageService');
const adminConstants = require('@constants/admin/adminConstants');
const { sequelize } = require('@models');
const bcrypt = require('bcryptjs');
const libphonenumber = require('google-libphonenumber');

const fetchUserAndAdmin = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: admin, as: 'admin_profile' }],
  });
  const adminProfile = user?.admin_profile;
  if (!user || !adminProfile) {
    throw new AppError('User or admin profile not found', 404, adminConstants.ERROR_CODES.PROFILE_NOT_FOUND);
  }
  return { user, adminProfile };
};

class AdminProfileService {
  /**
   * Get admin profile by user ID
   * @param {number} userId
   * @returns {object} Admin profile data
   */
  async getProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: admin,
            as: 'admin_profile',
          },
        ],
      });

      if (!user || !user.admin_profile) {
        throw new AppError('User or admin profile not found', 404, adminConstants.ERROR_CODES.PROFILE_NOT_FOUND);
      }

      logger.info('Admin profile retrieved', { userId });
      return {
        id: user.admin_profile.id,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          country: user.country,
          avatar_url: user.avatar_url,
          is_verified: user.is_verified,
          status: user.status,
        },
        last_activity_at: user.admin_profile.last_activity_at,
        availability_status: user.admin_profile.availability_status || adminConstants.AVAILABILITY_STATUSES.AVAILABLE,
        created_at: user.admin_profile.created_at,
        updated_at: user.admin_profile.updated_at,
      };
    } catch (error) {
      logger.error('Failed to retrieve admin profile', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve profile', 500, adminConstants.ERROR_CODES.PROFILE_RETRIEVAL_FAILED);
    }
  }

  /**
   * Update admin personal information
   * @param {number} userId
   * @param {object} updateData
   * @param {object} requestingUser
   * @returns {object} Updated admin profile
   */
  async updatePersonalInfo(userId, updateData, requestingUser) {
    try {
      const { first_name, last_name, email, phone, country } = updateData;
      const { user, adminProfile } = await fetchUserAndAdmin(userId);
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

      // Authorization: Only the admin themselves or another admin can update
      if (requestingUser.id !== userId && requestingUser.role !== 'admin') {
        throw new AppError('Unauthorized to update this profile', 403, adminConstants.ERROR_CODES.UNAUTHORIZED);
      }

      // Validate phone number if provided
      if (phone && phone !== user.phone) {
        try {
          const number = phoneUtil.parse(phone);
          if (!phoneUtil.isValidNumber(number)) {
            throw new AppError('Invalid phone number format', 400, adminConstants.ERROR_CODES.INVALID_PHONE);
          }
          const existingUser = await User.findOne({ where: { phone } });
          if (existingUser && existingUser.id !== user.id) {
            throw new AppError('Phone number already in use', 400, adminConstants.ERROR_CODES.DUPLICATE_PHONE);
          }
        } catch (error) {
          if (error instanceof AppError) throw error;
          throw new AppError('Invalid phone number format', 400, adminConstants.ERROR_CODES.INVALID_PHONE);
        }
      }

      // Validate country if provided
      if (country && !adminConstants.ALLOWED_COUNTRIES.includes(country)) {
        throw new AppError('Invalid country', 400, adminConstants.ERROR_CODES.INVALID_COUNTRY);
      }

      const userUpdates = {
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        email: email || user.email,
        phone: phone || user.phone,
        country: country || user.country,
      };

      await sequelize.transaction(async (t) => {
        await user.update(userUpdates, { transaction: t });
        await adminProfile.update({ last_activity_at: new Date() }, { transaction: t });
      });

      logger.info('Admin personal info updated', { userId, updatedFields: Object.keys(updateData) });
      return this.getProfile(userId);
    } catch (error) {
      logger.error('Failed to update admin personal info', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to update profile', 500, adminConstants.ERROR_CODES.PROFILE_UPDATE_FAILED);
    }
  }

  /**
   * Change admin password
   * @param {number} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {boolean} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('Changing admin password', { userId });

      const user = await User.scope(null).findByPk(userId, {
        attributes: ['id', 'password'],
      });
      if (!user) throw new AppError('User not found', 404, adminConstants.ERROR_CODES.USER_NOT_FOUND);

      if (!user.password) throw new AppError('Password data unavailable', 500, adminConstants.ERROR_CODES.PASSWORD_UNAVAILABLE);

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) throw new AppError('Current password is incorrect', 401, adminConstants.ERROR_CODES.INVALID_PASSWORD);

      // Validate new password
      const passwordValidator = require('password-validator');
      const schema = new passwordValidator();
      schema
        .is().min(8)
        .is().max(100)
        .has().uppercase()
        .has().lowercase()
        .has().digits()
        .has().symbols();

      if (!schema.validate(newPassword)) {
        throw new AppError('New password does not meet complexity requirements', 400, adminConstants.ERROR_CODES.INVALID_NEW_PASSWORD);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      logger.info('Admin password changed', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to change admin password', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to change password', 500, adminConstants.ERROR_CODES.PASSWORD_CHANGE_FAILED);
    }
  }

  /**
   * Upload admin profile picture
   * @param {number} userId
   * @param {object} file
   * @returns {string} Avatar URL
   */
  async uploadProfilePicture(userId, file) {
    try {
      if (!file) throw new AppError('No file uploaded', 400, adminConstants.ERROR_CODES.NO_FILE_UPLOADED);
      const { user } = await fetchUserAndAdmin(userId);

      return await sequelize.transaction(async (t) => {
        const avatarUrl = await imageService.uploadImage(userId, file, 'admin');
        await user.update({ avatar_url: avatarUrl }, { transaction: t });
        logger.info('Admin profile picture updated', { userId, avatarUrl });
        return avatarUrl;
      });
    } catch (error) {
      logger.error('Failed to upload admin profile picture', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to upload profile picture', 500, adminConstants.ERROR_CODES.PICTURE_UPLOAD_FAILED);
    }
  }

  /**
   * Delete admin profile picture
   * @param {number} userId
   * @returns {boolean} Success status
   */
  async deleteProfilePicture(userId) {
    try {
      const { user } = await fetchUserAndAdmin(userId);

      return await sequelize.transaction(async (t) => {
        if (!user.avatar_url) {
          throw new AppError('No profile picture to delete', 400, adminConstants.ERROR_CODES.NO_PROFILE_PICTURE);
        }
        await imageService.deleteImage(userId, 'admin');
        await user.update({ avatar_url: null }, { transaction: t });
        logger.info('Admin profile picture deleted', { userId });
        return true;
      });
    } catch (error) {
      logger.error('Failed to delete admin profile picture', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to delete profile picture', 500, adminConstants.ERROR_CODES.PICTURE_DELETE_FAILED);
    }
  }

  /**
   * Update admin availability status
   * @param {number} userId
   * @param {string} status
   * @param {object} requestingUser
   * @returns {string} Updated status
   */
  async updateAvailabilityStatus(userId, status, requestingUser) {
    try {
      const validStatuses = Object.values(adminConstants.AVAILABILITY_STATUSES);
      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid availability status', 400, adminConstants.ERROR_CODES.INVALID_STATUS);
      }

      const { adminProfile } = await fetchUserAndAdmin(userId);

      // Authorization: Only the admin themselves can update their status
      if (requestingUser.id !== userId) {
        throw new AppError('Unauthorized to update availability status', 403, adminConstants.ERROR_CODES.UNAUTHORIZED);
      }

      await adminProfile.update({ availability_status: status });
      logger.info('Admin availability status updated', { userId, status });
      return status;
    } catch (error) {
      logger.error('Failed to update admin availability status', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to update availability status', 500, adminConstants.ERROR_CODES.STATUS_UPDATE_FAILED);
    }
  }
}

module.exports = new AdminProfileService();