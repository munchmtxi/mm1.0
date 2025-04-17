'use strict';

const { Merchant, User, MerchantBranch, PasswordHistory, Notification, Address, Session, Sequelize } = require('@models');
const { TYPES: BUSINESS_TYPES } = require('@constants/merchant/businessTypes');
const bcrypt = require('bcryptjs');
const { sequelize } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mapService = require('@services/common/mapService');
const TokenService = require('@services/common/tokenService');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5-minute cache

module.exports = {
  async getProfile(merchantId, includeBranches = false, token) {
    const transaction = await sequelize.transaction();
    try {
      // Verify token
      if (!token) {
        throw new AppError('Token is required', 401, 'MISSING_TOKEN');
      }
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }

      // Check cache
      const cacheKey = `merchant_profile_${merchantId}_${includeBranches}`;
      const cachedProfile = cache.get(cacheKey);
      if (cachedProfile) {
        logger.info('Returning cached merchant profile', { merchantId });
        await transaction.commit();
        return cachedProfile;
      }

      // Define include for addressRecord and branches
      const include = [
        {
          as: 'addressRecord',
          model: Address,
          attributes: ['id', 'formattedAddress', 'latitude', 'longitude'],
          where: {
            user_id: { [Sequelize.Op.eq]: Sequelize.col('Merchant.user_id') }
          },
          required: false
        }
      ];

      if (includeBranches) {
        include.push({
          as: 'branches',
          model: MerchantBranch,
          attributes: ['id', 'name', 'address', 'is_active'],
          include: [
            {
              as: 'addressRecord',
              model: Address,
              attributes: ['id', 'formattedAddress', 'latitude', 'longitude'],
              required: false
            }
          ]
        });
      }

      // Fetch merchant
      const merchant = await Merchant.findByPk(merchantId, {
        include,
        attributes: [
          'id',
          'user_id',
          'business_name',
          'business_type',
          'business_type_details',
          'address',
          'phone_number',
          'currency',
          'time_zone',
          'business_hours',
          'notification_preferences',
          'whatsapp_enabled',
          'logo_url',
          'banner_url',
          'storefront_url',
          'delivery_area',
          'service_radius'
        ],
        transaction
      });

      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      // Fetch user
      const user = await User.findByPk(merchant.user_id, {
        attributes: ['id', 'first_name', 'last_name', 'email'],
        transaction
      });

      // Combine results
      const result = merchant.toJSON();
      result.user = user ? user.toJSON() : null;

      // Cache the result
      cache.set(cacheKey, result);

      await transaction.commit();
      logger.logApiEvent('Merchant profile retrieved', { merchantId, includeBranches });
      return result;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to retrieve merchant profile', {
        error: error.message,
        merchantId,
        stack: error.stack
      });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to retrieve profile', 500, 'PROFILE_RETRIEVAL_FAILED');
    }
  },

  async updateProfile(merchantId, updateData, token) {
    const transaction = await sequelize.transaction();
    try {
      // Verify token
      if (!token) {
        throw new AppError('Token is required', 401, 'MISSING_TOKEN');
      }
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }

      const merchant = await Merchant.findByPk(merchantId, { transaction });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      // Validate business type details
      if (updateData.business_type_details) {
        const typeConfig = BUSINESS_TYPES[updateData.business_type?.toUpperCase() || merchant.business_type.toUpperCase()];
        if (!typeConfig) {
          throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
        }
        const { requiredFields, allowedServiceTypes, requiredLicenses } = typeConfig;
        const details = updateData.business_type_details;
        const missingFields = requiredFields.filter((field) => !details[field]);
        if (missingFields.length) {
          throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400, 'MISSING_FIELDS');
        }
        if (details.service_types && details.service_types.some((s) => !allowedServiceTypes.includes(s))) {
          throw new AppError('Invalid service types', 400, 'INVALID_SERVICE_TYPES');
        }
        if (details.licenses && requiredLicenses.some((l) => !details.licenses.includes(l))) {
          throw new AppError('Missing required licenses', 400, 'MISSING_LICENSES');
        }
      }

      // Invalidate cache
      cache.del(`merchant_profile_${merchantId}_true`);
      cache.del(`merchant_profile_${merchantId}_false`);

      await merchant.update(updateData, { transaction });
      await transaction.commit();
      logger.logSecurityEvent('Merchant profile updated', { merchantId, updatedFields: Object.keys(updateData) });
      return merchant;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to update merchant profile', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update profile', 500, 'PROFILE_UPDATE_FAILED');
    }
  },

  async updateNotificationPreferences(merchantId, preferences, token) {
    const transaction = await sequelize.transaction();
    try {
      // Verify token
      if (!token) {
        throw new AppError('Token is required', 401, 'MISSING_TOKEN');
      }
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }
      if (!preferences || typeof preferences !== 'object') {
        throw new AppError('Invalid preferences format', 400, 'INVALID_PREFERENCES');
      }

      const merchant = await Merchant.findByPk(merchantId, { transaction });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const validKeys = ['orderUpdates', 'bookingNotifications', 'customerFeedback', 'marketingMessages'];
      const invalidKeys = Object.keys(preferences).filter((k) => !validKeys.includes(k));
      if (invalidKeys.length) {
        throw new AppError(`Invalid notification preferences: ${invalidKeys.join(', ')}`, 400, 'INVALID_PREFERENCES');
      }

      // Invalidate cache
      cache.del(`merchant_profile_${merchantId}_true`);
      cache.del(`merchant_profile_${merchantId}_false`);

      await merchant.update({ notification_preferences: preferences }, { transaction });
      await transaction.commit();
      logger.logApiEvent('Notification preferences updated', { merchantId, preferences });
      return merchant.notification_preferences;
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to update notification preferences', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update preferences', 500, 'PREFERENCES_UPDATE_FAILED');
    }
  },

  async changePassword(userId, { oldPassword, newPassword, confirmNewPassword }, clientIp, deviceId, deviceType) {
    const transaction = await sequelize.transaction();
    try {
      // Validate input
      if (!userId || isNaN(userId)) {
        throw new AppError('Invalid user ID', 400, 'INVALID_USER_ID');
      }
      if (!oldPassword || !newPassword || !confirmNewPassword) {
        throw new AppError('All password fields are required', 400, 'MISSING_PASSWORD_FIELDS');
      }

      const user = await User.findByPk(userId, {
        attributes: ['id', 'password'],
        transaction
      });
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (!user.password || !(await bcrypt.compare(oldPassword, user.password))) {
        throw new AppError('Incorrect old password', 400, 'INVALID_PASSWORD');
      }

      if (newPassword !== confirmNewPassword) {
        throw new AppError('New passwords do not match', 400, 'PASSWORD_MISMATCH');
      }

      const passwordValidator = require('password-validator');
      const schema = new passwordValidator();
      schema.is().min(8).has().uppercase().has().lowercase().has().digits().has().symbols();
      if (!schema.validate(newPassword)) {
        throw new AppError('New password does not meet complexity requirements', 400, 'WEAK_PASSWORD');
      }

      const history = await PasswordHistory.findAll({
        where: { user_id: userId },
        attributes: ['id', 'password_hash'],
        transaction
      });
      const isReused = history.length > 0
        ? await Promise.all(
            history.map((h) => bcrypt.compare(newPassword, h.password_hash))
          ).then((results) => results.some((r) => r))
        : false;
      if (isReused) {
        throw new AppError('Cannot reuse a previous password', 400, 'PASSWORD_REUSED');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      await user.update({ password: hashedPassword }, { transaction });
      await PasswordHistory.create(
        { user_id: userId, user_type: 'merchant', password_hash: hashedPassword },
        { transaction }
      );

      const merchant = await Merchant.findOne({ where: { user_id: userId }, transaction });
      await merchant.update({ last_password_update: new Date() }, { transaction });

      await Session.update(
        { isActive: false },
        { where: { userId: userId, isActive: true }, transaction }
      );

      const { accessToken, jti } = await TokenService.generateAccessToken({
        id: user.id,
        role: 'merchant',
        merchant_id: merchant.id,
        deviceId,
        deviceType,
      });

      // Invalidate cache
      cache.del(`merchant_profile_${merchant.id}_true`);
      cache.del(`merchant_profile_${merchant.id}_false`);

      await transaction.commit();
      logger.logSecurityEvent('Password changed and new token issued', { userId, clientIp });
      return { success: true, accessToken, jti };
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to change password', { error: error.message, userId, clientIp });
      throw error instanceof AppError ? error : new AppError('Failed to change password', 500, 'PASSWORD_CHANGE_FAILED');
    }
  },

  async updateGeolocation(merchantId, locationData, token) {
    const transaction = await sequelize.transaction();
    try {
      // Verify token
      if (!token) {
        throw new AppError('Token is required', 401, 'MISSING_TOKEN');
      }
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }
      if (!locationData || typeof locationData !== 'object') {
        throw new AppError('Invalid location data', 400, 'INVALID_LOCATION_DATA');
      }

      const merchant = await Merchant.findByPk(merchantId, { transaction });
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const resolvedLocation = await mapService.resolveLocation(locationData);
      const { formattedAddress, latitude, longitude, placeId, components, countryCode } = resolvedLocation;

      let addressRecord = await Address.findOne({
        where: { placeId, user_id: merchant.user_id },
        transaction
      });

      if (!addressRecord) {
        addressRecord = await Address.create({
          user_id: merchant.user_id,
          formattedAddress,
          placeId,
          latitude,
          longitude,
          components,
          countryCode,
          validationStatus: 'VALID',
          validatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }, { transaction });
      }

      await merchant.update({
        address: formattedAddress,
        location: { type: 'Point', coordinates: [longitude, latitude] },
        address_id: addressRecord.id,
      }, { transaction });

      // Invalidate cache
      cache.del(`merchant_profile_${merchantId}_true`);
      cache.del(`merchant_profile_${merchantId}_false`);

      await transaction.commit();
      logger.logApiEvent('Merchant geolocation updated', { merchantId, formattedAddress });
      return { address: addressRecord, merchant };
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Failed to update geolocation', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update geolocation', 500, 'GEOLOCATION_UPDATE_FAILED');
    }
  },
};