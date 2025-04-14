'use strict';

const { Merchant, User, MerchantBranch, PasswordHistory, Notification, Address, Session } = require('@models');
const { TYPES: BUSINESS_TYPES } = require('@constants/merchant/businessTypes');
const bcrypt = require('bcryptjs');
const { sequelize } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const mapService = require('@services/common/mapService');
const TokenService = require('@services/common/tokenService');

module.exports = {
  async getProfile(merchantId, includeBranches = false, token) {
    try {
      logger.info('getProfile called', { merchantId, includeBranches });

      // Verify token
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        logger.warn('Token merchant ID does not match provided merchant ID', { tokenMerchantId: payload.merchant_id, merchantId });
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      // Validate input
      if (!merchantId || isNaN(merchantId)) {
        logger.warn('Invalid merchantId', { merchantId });
        throw new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID');
      }

      // Define include for branches and Address
      const include = [
        {
          model: Address,
          as: 'addressRecord',
          attributes: [
            'id',
            ['formattedAddress', 'formattedAddress'], // Explicit alias
            'latitude',
            'longitude',
          ],
          required: false,
        },
      ];
      if (includeBranches) {
        include.push({
          model: MerchantBranch,
          as: 'branches',
          attributes: ['id', 'name', 'address', 'is_active'],
          required: false,
        });
      }

      // Fetch merchant
      logger.info('Executing Merchant.findByPk', { merchantId, include });
      const merchant = await Merchant.findByPk(merchantId, {
        include,
        attributes: [
          'id',
          'user_id',
          'business_name',
          'business_type',
          'business_type_details',
          'address',
          'address_id',
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
          'location',
          'service_radius',
          'geofence_id',
          'created_at',
          'updated_at',
        ],
      });

      if (!merchant) {
        logger.warn('Merchant not found', { merchantId });
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      // Fetch user separately
      logger.info('Fetching User', { user_id: merchant.user_id });
      const user = await User.findByPk(merchant.user_id, {
        attributes: ['id', 'first_name', 'last_name', 'email'],
      });

      // Combine results
      const result = merchant.toJSON();
      result.user = user ? user.toJSON() : null;

      logger.logApiEvent('Merchant profile retrieved', { merchantId, includeBranches });
      return result;
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve merchant profile', {
        error: error.message,
        merchantId,
        stack: error.stack,
      });
      throw error instanceof AppError
        ? error
        : new AppError('Failed to retrieve profile', 500, 'PROFILE_RETRIEVAL_FAILED');
    }
  },

  async updateProfile(merchantId, updateData, token) {
    try {
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        logger.warn('Token merchant ID does not match provided merchant ID', { tokenMerchantId: payload.merchant_id, merchantId });
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

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

      await merchant.update(updateData);
      logger.logSecurityEvent('Merchant profile updated', { merchantId, updatedFields: Object.keys(updateData) });
      return merchant;
    } catch (error) {
      logger.logErrorEvent('Failed to update merchant profile', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update profile', 500, 'PROFILE_UPDATE_FAILED');
    }
  },

  async updateNotificationPreferences(merchantId, preferences, token) {
    try {
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        logger.warn('Token merchant ID does not match provided merchant ID', { tokenMerchantId: payload.merchant_id, merchantId });
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const validKeys = ['orderUpdates', 'bookingNotifications', 'customerFeedback', 'marketingMessages'];
      const invalidKeys = Object.keys(preferences).filter((k) => !validKeys.includes(k));
      if (invalidKeys.length) {
        throw new AppError(`Invalid notification preferences: ${invalidKeys.join(', ')}`, 400, 'INVALID_PREFERENCES');
      }

      await merchant.update({ notification_preferences: preferences });
      logger.logApiEvent('Notification preferences updated', { merchantId, preferences });
      return merchant.notification_preferences;
    } catch (error) {
      logger.logErrorEvent('Failed to update notification preferences', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update preferences', 500, 'PREFERENCES_UPDATE_FAILED');
    }
  },

  async changePassword(userId, { oldPassword, newPassword, confirmNewPassword }, clientIp, deviceId, deviceType) {
    const transaction = await sequelize.transaction();
    try {
      const user = await User.findByPk(userId, {
        attributes: ['id', 'password'],
        transaction
      });
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      logger.info('User password field', { hasPassword: !!user.password });
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
        attributes: ['id', 'password_hash'], // Explicitly include password_hash
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
    try {
      const payload = await TokenService.verifyToken(token);
      if (payload.merchant_id !== merchantId) {
        logger.warn('Token merchant ID does not match provided merchant ID', { tokenMerchantId: payload.merchant_id, merchantId });
        throw new AppError('Unauthorized access', 403, 'UNAUTHORIZED');
      }

      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const resolvedLocation = await mapService.resolveLocation(locationData);
      const { formattedAddress, latitude, longitude } = resolvedLocation;
      const addressRecord = await Address.create({
        formattedAddress,
        placeId: resolvedLocation.placeId,
        latitude,
        longitude,
        components: resolvedLocation.components,
        countryCode: resolvedLocation.countryCode,
        validationStatus: 'VALID',
        validatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await merchant.update({
        address: formattedAddress,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        address_id: addressRecord.id,
      });

      logger.logApiEvent('Merchant geolocation updated', { merchantId, formattedAddress });
      return { address: addressRecord, merchant };
    } catch (error) {
      logger.logErrorEvent('Failed to update geolocation', { error: error.message, merchantId });
      throw error instanceof AppError ? error : new AppError('Failed to update geolocation', 500, 'GEOLOCATION_UPDATE_FAILED');
    }
  },
};