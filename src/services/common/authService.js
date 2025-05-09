'use strict';

const jwt = require('jsonwebtoken');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const jwtConfig = require('@config/jwtConfig');
const authConstants = require('@constants/common/authConstants');
const { TYPES: BUSINESS_TYPES } = require('@constants/merchant/businessTypes');
const { User, Role, Device, Merchant, Customer, Driver, admin, Staff, Session } = require('@models'); 

const TokenService = {
  generateTokens: async (user, deviceInfo = {}) => {
    const roleName = user.role ? user.role.name : (await Role.findByPk(user.role_id)).name;
    const payload = { id: user.id, role: roleName };
    if (roleName === authConstants.ROLES.MERCHANT && user.merchant_profile) {
      payload.merchant_id = user.merchant_profile.id;
    }
    if (roleName === authConstants.ROLES.ADMIN && user.admin_profile) {
      payload.admin_id = user.admin_profile.id;
    }
  
    const accessToken = jwt.sign(payload, jwtConfig.secretOrKey, {
      expiresIn: jwtConfig.expiresIn,
      algorithm: jwtConfig.algorithm,
    });
    const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
      expiresIn: jwtConfig.refreshExpiresIn,
      algorithm: jwtConfig.algorithm,
    });
  
    if (deviceInfo?.deviceId) {
      const deviceType = deviceInfo.deviceType || 'unknown';
      let platform;
      switch (deviceType.toLowerCase()) {
        case 'desktop':
          platform = 'web';
          break;
        case 'mobile':
          platform = 'ios';
          break;
        case 'tablet':
          platform = 'ios';
          break;
        default:
          platform = 'web';
      }
  
      logger.info('Creating device with:', { deviceId: deviceInfo.deviceId, deviceType, platform });
  
      const [device, created] = await Device.findOrCreate({
        where: { user_id: user.id, device_id: deviceInfo.deviceId },
        defaults: {
          user_id: user.id,
          device_id: deviceInfo.deviceId,
          device_type: deviceType,
          platform: platform,
          last_active_at: new Date(),
          last_used_at: new Date(),
          is_pwa: false,
        },
      });
  
      await device.update({
        refresh_token: refreshToken,
        refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        last_active_at: new Date(),
      });
  
      logger.info('Device handled:', { deviceId: deviceInfo.deviceId, created });

      // Add Session storage
      try {
        await Session.create({
          userId: user.id,
          token: accessToken,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        logger.info('Session stored for access token', { userId: user.id, token: accessToken.substring(0, 20) + '...' });
      } catch (error) {
        logger.error('Failed to store session', { userId: user.id, error: error.message });
        throw new AppError('Failed to store session', 500, 'SESSION_STORAGE_FAILED');
      }
    }
  
    logger.logSecurityEvent('Tokens generated', { userId: user.id, role: roleName });
    return { accessToken, refreshToken };
  },

  logoutUser: async (userId, deviceId, clearAllDevices) => {
    if (clearAllDevices) {
      await Device.update(
        {
          refresh_token: null,
          refresh_token_expires_at: null,
          remember_token: null,
          remember_token_expires_at: null,
        },
        { where: { user_id: userId } }
      );
      // Add Session cleanup
      await Session.update(
        { isActive: false, updatedAt: new Date() },
        { where: { userId, isActive: true } }
      );
    } else if (deviceId) {
      await Device.update(
        {
          refresh_token: null,
          refresh_token_expires_at: null,
          remember_token: null,
          remember_token_expires_at: null,
        },
        { where: { user_id: userId, device_id: deviceId } }
      );
      // Add Session cleanup for device
      await Session.update(
        { isActive: false, updatedAt: new Date() },
        { where: { userId, token: (await Device.findOne({ where: { user_id: userId, device_id: deviceId } }))?.refresh_token }}
      );
    }
    logger.logSecurityEvent('User logged out', { userId, deviceId, clearAllDevices });
  },
};

// Rest of authService.js unchanged
const registerUser = async (userData, isAdmin = false) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      phone,
      country,
      role,
      business_name,
      address,
      business_type,
      business_type_details,
      vehicle_info,
      license_number,
      permissions,
    } = userData;

    const roleName = role || authConstants.ROLES.CUSTOMER;
    if (roleName !== authConstants.ROLES.CUSTOMER && !isAdmin) {
      throw new AppError('Only admins can register non-customer roles', 403, 'UNAUTHORIZED');
    }

    const roleRecord = await Role.findOne({ where: { name: roleName } });
    if (!roleRecord) {
      throw new AppError('Invalid role', 400, 'INVALID_ROLE');
    }

    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      phone,
      country,
      role_id: roleRecord.id,
      is_verified: roleName === authConstants.ROLES.ADMIN ? true : false,
      status: authConstants.AUTH.STATUS.ACTIVE,
    });

    if (roleName === authConstants.ROLES.MERCHANT) {
      const merchantType = business_type || 'cafe';
      if (!BUSINESS_TYPES[merchantType.toUpperCase()]) {
        throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
      }
      await Merchant.create({
        user_id: user.id,
        business_name: business_name || `${first_name}'s Cafe`,
        business_type: merchantType,
        address: address || 'Blantyre, Malawi',
        phone_number: phone,
        currency: 'MWK',
        time_zone: 'Africa/Blantyre',
        business_type_details: business_type_details || {
          cuisine_type: ['coffee'],
          seating_capacity: 30,
          service_types: ['dine_in', 'takeaway'],
          licenses: ['food_service', 'health_safety'],
        },
        service_radius: 5.0,
      });
    } else if (roleName === authConstants.ROLES.CUSTOMER) {
      await Customer.create({
        user_id: user.id,
        phone_number: phone,
        address: address || 'Blantyre, Malawi',
        country: country || 'MWI',
      });
    } else if (roleName === authConstants.ROLES.DRIVER) {
      await Driver.create({
        user_id: user.id,
        name: `${first_name} ${last_name}`,
        phone_number: phone,
        vehicle_info: vehicle_info || {},
        license_number: license_number || `LIC-${user.id}`,
      });
    } else if (roleName === authConstants.ROLES.ADMIN) {
      await admin.create({
        user_id: user.id,
        permissions: permissions || {
          can_manage_users: true,
          can_view_reports: true,
          can_update_settings: true,
        },
      });
    }

    logger.logSecurityEvent('User registered', { userId: user.id, role: roleName });
    return user;
  } catch (error) {
    logger.logErrorEvent('Register user failed', { error: error.message });
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email or phone already in use', 400, 'DUPLICATE_USER');
    }
    throw error;
  }
};

const loginUser = async (email, password, deviceInfo, roleName) => {
  try {
    logger.info(`Available models: ${Object.keys(require('@models')).join(', ')}`);
    logger.info('Login attempt details:', { email, roleName, deviceInfo });

    const include = [
      { model: Role, as: 'role', where: { name: roleName } },
      { model: Merchant, as: 'merchant_profile' },
      { model: Customer, as: 'customer_profile' },
      { model: Driver, as: 'driver_profile' },
      { model: admin, as: 'admin_profile' },
      { model: Staff, as: 'staff_profile' },
    ];

    const user = await User.findOne({
      where: { email },
      include,
      attributes: {
        include: ['password'],
        exclude: ['two_factor_secret', 'password_reset_token', 'password_reset_expires'],
      },
    });

    if (!user || user.role.name !== roleName) {
      logger.error('User not found or role mismatch', { email, roleName });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = user.valid_password(password);
    logger.info('Password validation:', { isValid });
    if (!isValid) {
      logger.error('Password incorrect', { email });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    if (user.status !== authConstants.AUTH.STATUS.ACTIVE) {
      throw new AppError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    if (!user.is_verified && roleName !== authConstants.ROLES.ADMIN) {
      throw new AppError('Please verify your account', 403, 'ACCOUNT_UNVERIFIED');
    }

    const { accessToken, refreshToken } = await TokenService.generateTokens(user, deviceInfo);

    logger.logSecurityEvent('User logged in', { userId: user.id, role: roleName });
    return { user, accessToken, refreshToken };
  } catch (error) {
    logger.logErrorEvent('Login failed', { error: error.message });
    throw error;
  }
};

const googleOAuthLogin = async (user, deviceInfo) => {
  try {
    const deviceType = deviceInfo?.deviceType || 'web';
    const platform = deviceInfo?.platform || (deviceType === 'desktop' ? 'web' : 'ios');

    const { accessToken, refreshToken } = await TokenService.generateTokens(user, {
      deviceId: deviceInfo?.deviceId,
      deviceType,
      platform,
    });

    logger.logSecurityEvent('Google OAuth login', { userId: user.id, role: user.role?.name });
    return { user, accessToken, refreshToken };
  } catch (error) {
    logger.logErrorEvent('Google OAuth login failed', { error: error.message });
    throw error;
  }
};

const refreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret);
    const user = await User.findByPk(decoded.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Merchant, as: 'merchant_profile' },
        { model: Customer, as: 'customer_profile' },
        { model: Driver, as: 'driver_profile' },
        { model: admin, as: 'admin_profile' },
        { model: Staff, as: 'staff_profile' },
      ],
    });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    const { accessToken, refreshToken: newRefreshToken } = await TokenService.generateTokens(user, null);
    logger.logSecurityEvent('Tokens refreshed', { userId: user.id });
    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    logger.logErrorEvent('Refresh token failed', { error: error.message });
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleOAuthLogin,
  logoutUser: TokenService.logoutUser,
  refreshToken,
};