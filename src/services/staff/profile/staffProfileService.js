'use strict';
const { Staff, User, Merchant, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const imageService = require('@services/common/imageService');
const mapService = require('@services/common/mapService');
const tokenService = require('@services/common/tokenService');
const { sequelize } = require('@models');
const bcrypt = require('bcryptjs');
const libphonenumber = require('google-libphonenumber');

const fetchUserAndStaff = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Staff, as: 'staff_profile' }],
  });
  const staff = user?.staff_profile;
  if (!user || !staff) {
    throw new AppError('User or staff profile not found', 404, 'PROFILE_NOT_FOUND');
  }
  return { user, staff };
};

class StaffProfileService {
  /**
   * Get staff profile by user ID
   * @param {number} userId
   * @returns {object} Staff profile data
   */
  async getProfile(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          {
            model: Staff,
            as: 'staff_profile',
            include: [
              { model: Merchant, as: 'merchant', attributes: ['id', 'business_name'] },
              { model: MerchantBranch, as: 'branch', attributes: ['id', 'name', 'address'] },
            ],
          },
        ],
      });

      if (!user || !user.staff_profile) {
        throw new AppError('User or staff profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      logger.info('Staff profile retrieved', { userId });
      return {
        id: user.staff_profile.id,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone,
          avatar_url: user.avatar_url,
        },
        merchant: user.staff_profile.merchant,
        branch: user.staff_profile.branch,
        position: user.staff_profile.position,
        availability_status: user.staff_profile.availability_status,
        work_location: user.staff_profile.work_location,
        performance_metrics: user.staff_profile.performance_metrics,
        created_at: user.staff_profile.created_at,
        updated_at: user.staff_profile.updated_at,
      };
    } catch (error) {
      logger.error('Failed to retrieve staff profile', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve profile', 500, 'PROFILE_RETRIEVAL_FAILED');
    }
  }

  /**
   * Update staff personal information
   * @param {number} userId
   * @param {object} updateData
   * @param {object} requestingUser
   * @returns {object} Updated staff profile
   */
  async updatePersonalInfo(userId, updateData, requestingUser) {
    try {
      const { first_name, last_name, email, phone, position, work_location, branch_id } = updateData;
      const { user, staff } = await fetchUserAndStaff(userId);
      const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

      // Authorization: Only staff themselves, their merchant, or admin can update
      if (
        requestingUser.id !== userId &&
        requestingUser.role !== 'admin' &&
        requestingUser.merchant_id !== staff.merchant_id
      ) {
        throw new AppError('Unauthorized to update this profile', 403, 'UNAUTHORIZED');
      }

      // Validate phone number if provided
      if (phone && phone !== user.phone) {
        try {
          const number = phoneUtil.parse(phone);
          if (!phoneUtil.isValidNumber(number)) {
            throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE');
          }
          const existingUser = await User.findOne({ where: { phone } });
          if (existingUser && existingUser.id !== user.id) {
            throw new AppError('Phone number already in use', 400, 'DUPLICATE_PHONE');
          }
        } catch (error) {
          if (error instanceof AppError) throw error;
          throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE');
        }
      }

      // Validate work_location if provided
      if (work_location) {
        try {
          const { latitude, longitude } = work_location;
          const resolvedLocation = await mapService.resolveLocation({ coordinates: { latitude, longitude } });
          updateData.work_location = {
            lat: resolvedLocation.latitude,
            lng: resolvedLocation.longitude,
            formattedAddress: resolvedLocation.formattedAddress,
          };
        } catch (error) {
          throw new AppError('Invalid work location', 400, 'INVALID_LOCATION');
        }
      }

      // Validate branch_id if provided
      if (branch_id) {
        const branch = await MerchantBranch.findByPk(branch_id);
        if (!branch || branch.merchant_id !== staff.merchant_id) {
          throw new AppError('Invalid branch assignment', 400, 'INVALID_BRANCH');
        }
      }

      const userUpdates = {
        first_name: first_name || user.first_name,
        last_name: last_name || user.last_name,
        email: email || user.email,
        phone: phone || user.phone,
      };

      const staffUpdates = {
        position: position || staff.position,
        work_location: work_location || staff.work_location,
        branch_id: branch_id || staff.branch_id,
      };

      await sequelize.transaction(async (t) => {
        await user.update(userUpdates, { transaction: t });
        await staff.update(staffUpdates, { transaction: t });
      });

      logger.info('Staff personal info updated', { userId, updatedFields: Object.keys(updateData) });
      return this.getProfile(userId);
    } catch (error) {
      logger.error('Failed to update staff personal info', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to update profile', 500, 'PROFILE_UPDATE_FAILED');
    }
  }

  /**
   * Change staff password
   * @param {number} userId
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {boolean} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      logger.info('Changing staff password', { userId });

      const user = await User.scope(null).findByPk(userId, {
        attributes: ['id', 'password'],
      });
      if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

      if (!user.password) throw new AppError('Password data unavailable', 500, 'PASSWORD_UNAVAILABLE');

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');

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
        throw new AppError('New password does not meet complexity requirements', 400, 'INVALID_NEW_PASSWORD');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword, last_password_update: new Date() });

      // Log out all devices
      await tokenService.logoutUser(userId, null, true);

      logger.info('Staff password changed', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to change staff password', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to change password', 500, 'PASSWORD_CHANGE_FAILED');
    }
  }

  /**
   * Upload staff profile picture
   * @param {number} userId
   * @param {object} file
   * @returns {string} Avatar URL
   */
  async uploadProfilePicture(userId, file) {
    try {
      if (!file) throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
      const { user } = await fetchUserAndStaff(userId);

      return await sequelize.transaction(async (t) => {
        const avatarUrl = await imageService.uploadImage(userId, file, 'avatar');
        await user.update({ avatar_url: avatarUrl }, { transaction: t });
        logger.info('Staff profile picture updated', { userId, avatarUrl });
        return avatarUrl;
      });
    } catch (error) {
      logger.error('Failed to upload staff profile picture', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to upload profile picture', 500, 'PICTURE_UPLOAD_FAILED');
    }
  }

  /**
   * Delete staff profile picture
   * @param {number} userId
   * @returns {boolean} Success status
   */
  async deleteProfilePicture(userId) {
    try {
      const { user } = await fetchUserAndStaff(userId);

      return await sequelize.transaction(async (t) => {
        if (!user.avatar_url) {
          throw new AppError('No profile picture to delete', 400, 'NO_PROFILE_PICTURE');
        }
        await imageService.deleteImage(userId, 'avatar');
        await user.update({ avatar_url: null }, { transaction: t });
        logger.info('Staff profile picture deleted', { userId });
        return true;
      });
    } catch (error) {
      logger.error('Failed to delete staff profile picture', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to delete profile picture', 500, 'PICTURE_DELETE_FAILED');
    }
  }

  /**
   * Update staff performance metrics
   * @param {number} userId
   * @param {object} metricsData
   * @param {object} requestingUser
   * @returns {object} Updated performance metrics
   */
  async updatePerformanceMetrics(userId, metricsData, requestingUser) {
    try {
      const { staff } = await fetchUserAndStaff(userId);

      // Authorization: Only merchant or admin can update metrics
      if (requestingUser.role !== 'admin' && requestingUser.merchant_id !== staff.merchant_id) {
        throw new AppError('Unauthorized to update performance metrics', 403, 'UNAUTHORIZED');
      }

      const { points, tier, redemption_history } = metricsData;
      const performance_metrics = {
        ...staff.performance_metrics,
        points: points || staff.performance_metrics.points,
        tier: tier || staff.performance_metrics.tier,
        lastEvaluated: new Date(),
        redemption_history: redemption_history || staff.performance_metrics.redemption_history,
      };

      await staff.update({ performance_metrics });
      logger.info('Staff performance metrics updated', { userId, performance_metrics });
      return performance_metrics;
    } catch (error) {
      logger.error('Failed to update staff performance metrics', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to update performance metrics', 500, 'METRICS_UPDATE_FAILED');
    }
  }

  /**
   * Update staff availability status
   * @param {number} userId
   * @param {string} status
   * @returns {string} Updated status
   */
  async updateAvailabilityStatus(userId, status) {
    try {
      const validStatuses = ['available', 'busy', 'on_break', 'offline'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid availability status', 400, 'INVALID_STATUS');
      }

      const { staff } = await fetchUserAndStaff(userId);
      await staff.update({ availability_status: status });
      logger.info('Staff availability status updated', { userId, status });
      return status;
    } catch (error) {
      logger.error('Failed to update staff availability status', { error: error.message, userId });
      throw error instanceof AppError ? error : new AppError('Failed to update availability status', 500, 'STATUS_UPDATE_FAILED');
    }
  }
}

module.exports = new StaffProfileService();