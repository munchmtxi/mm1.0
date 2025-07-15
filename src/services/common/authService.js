'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const jwtConfig = require('@config/jwtConfig');
const authConstants = require('@constants/common/authConstants');
const { SECURITY_CONSTANTS } = require('@constants/common/securityConstants');
const { MERCHANT_CONFIG } = require('@constants/merchant/merchantConstants');
const { User, Role, Device, Merchant, Customer, Driver, Admin, Staff, Session, AuditLog, Verification } = require('@models');

const TokenService = {
  generateTokens: async (user, deviceInfo = {}, tokenType = authConstants.TOKEN_CONSTANTS.TOKEN_TYPES.ACCESS) => {
    const role = await Role.findByPk(user.role_id);
    const payload = { id: user.id, role: role.name };
    if (role.name === 'merchant' && user.merchant_profile) payload.merchant_id = user.merchant_profile.id;
    if (role.name === 'admin' && user.admin_profile) payload.admin_id = user.admin_profile.id;

    const tokenOptions = {
      expiresIn: SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].TOKEN_EXPIRY_MINUTES * 60,
      algorithm: SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].ENCRYPTION_ALGORITHM,
    };

    const accessToken = jwt.sign(payload, jwtConfig.secretOrKey, tokenOptions);
    const refreshToken = tokenType === authConstants.TOKEN_CONSTANTS.TOKEN_TYPES.REFRESH
      ? jwt.sign(payload, jwtConfig.refreshSecret, {
          expiresIn: SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].TOKEN_EXPIRY_MINUTES * 60,
          algorithm: SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].ENCRYPTION_ALGORITHM,
        })
      : null;

    if (deviceInfo?.device_id) {
      const deviceType = deviceInfo.deviceType || 'unknown';
      const platform = deviceType.toLowerCase() === 'desktop' ? 'web' : deviceType.toLowerCase() === 'mobile' || deviceType.toLowerCase() === 'tablet' ? 'ios' : 'web';

      const activeDevices = await Device.count({ where: { user_id: user.id } });
      if (activeDevices >= SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].MAX_ACTIVE_TOKENS) {
        throw new AppError('Maximum device limit reached', 403, SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].ERROR_CODES.TOKEN_LIMIT_EXCEEDED);
      }

      const [device, created] = await Device.findOrCreate({
        where: { user_id: user.id, device_id: deviceInfo.device_id },
        defaults: {
          user_id: user.id,
          device_id: deviceInfo.device_id,
          device_type: deviceType,
          platform,
          last_active_at: new Date(),
          last_used_at: new Date(),
          is_pwa: false,
        },
      });

      await device.update({
        refresh_token: refreshToken,
        refresh_token_expires_at: new Date(Date.now() + SECURITY_CONSTANTS.ROLES[role.name.toUpperCase()].TOKEN_EXPIRY_MINUTES * 60 * 1000),
        last_active_at: new Date(),
      });

      await Session.create({
        user_id: user.id,
        token: accessToken,
        token_type: tokenType,
        status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE,
        expires_at: new Date(Date.now() + authConstants.SESSION_CONSTANTS.SESSION_TIMEOUT_MINUTES[role.name] * 60 * 1000),
        device_id: device.id,
        last_active_at: new Date(),
      });

      await AuditLog.create({
        user_id: user.id,
        log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.TOKEN_ISSUANCE,
        details: { token_type: tokenType, device_id: deviceInfo.device_id },
      });
    }

    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.TOKEN_ISSUANCE, { userId: user.id, role: role.name });
    return { accessToken, refreshToken };
  },

  logoutUser: async (userId, deviceId, clearAllDevices) => {
    if (clearAllDevices) {
      await Device.update(
        { refresh_token: null, refresh_token_expires_at: null, remember_token: null, remember_token_expires_at: null },
        { where: { user_id: userId } }
      );
      await Session.update(
        { status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.TERMINATED, updated_at: new Date() },
        { where: { user_id: userId, status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE } }
      );
    } else if (deviceId) {
      const device = await Device.findOne({ where: { user_id: userId, device_id: deviceId } });
      if (device) {
        await device.update({ refresh_token: null, refresh_token_expires_at: null, remember_token: null, remember_token_expires_at: null });
        await Session.update(
          { status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.TERMINATED, updated_at: new Date() },
          { where: { user_id: userId, device_id: device.id, status: authConstants.SESSION_CONSTANTS.SESSION_STATUSES.ACTIVE } }
        );
      }
    }
    await AuditLog.create({
      user_id: userId,
      log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGOUT,
      details: { device_id: deviceId, clear_all_devices: clearAllDevices },
    });
    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGOUT, { userId, deviceId, clearAllDevices });
  },
};

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
      mfa_method,
      staff_types,
    } = userData;

    const roleName = role || authConstants.AUTH_SETTINGS.DEFAULT_ROLE;
    if (!authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes(roleName)) {
      throw new AppError('Invalid role', 400, authConstants.ERROR_CODES.INVALID_ROLE);
    }
    if (roleName !== authConstants.AUTH_SETTINGS.DEFAULT_ROLE && !isAdmin) {
      throw new AppError('Only admins can register non-customer roles', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    const roleRecord = await Role.findOne({ where: { name: roleName } });
    if (!roleRecord) throw new AppError('Invalid role', 400, authConstants.ERROR_CODES.INVALID_ROLE);

    const user = await User.create({
      first_name,
      last_name,
      email,
      password,
      phone,
      country,
      role_id: roleRecord.id,
      is_verified: roleName === 'admin' ? true : false,
      status: authConstants.USER_STATUSES.ACTIVE,
      mfa_method: authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(roleName) ? mfa_method || authConstants.MFA_CONSTANTS.MFA_METHODS.EMAIL : null,
      mfa_status: authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(roleName) ? authConstants.MFA_CONSTANTS.MFA_STATUSES.PENDING : authConstants.MFA_CONSTANTS.MFA_STATUSES.DISABLED,
    });

    if (authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(roleName) && mfa_method === authConstants.MFA_CONSTANTS.MFA_METHODS.AUTH_APP) {
      const secret = speakeasy.generateSecret({ length: 20 });
      user.two_factor_secret = secret.base32;
      user.mfa_backup_codes = Array.from({ length: authConstants.MFA_CONSTANTS.MFA_BACKUP_CODES.COUNT }, () =>
        speakeasy.generateSecret({ length: authConstants.MFA_CONSTANTS.MFA_BACKUP_CODES.LENGTH }).base32
      );
      await user.save();
    }

    if (roleName === 'merchant') {
      const merchantType = business_type || 'cafe';
      if (!MERCHANT_CONFIG.SUPPORTED_MERCHANT_TYPES.includes(merchantType)) {
        throw new AppError('Invalid business type', 400, authConstants.ERROR_CODES.INVALID_BUSINESS_TYPE);
      }
      await Merchant.create({
        user_id: user.id,
        business_name: business_name || `${first_name}'s Cafe`,
        business_type: merchantType,
        address: address || 'Blantyre, Malawi',
        phone_number: phone,
        currency: authConstants.AUTH_SETTINGS.SUPPORTED_CURRENCIES.includes(country === 'MWI' ? 'MWK' : 'USD') ? (country === 'MWI' ? 'MWK' : 'USD') : authConstants.AUTH_SETTINGS.DEFAULT_CURRENCY,
        time_zone: 'Africa/Blantyre',
        business_type_details: business_type_details || {
          cuisine_type: ['coffee'],
          seating_capacity: 30,
          service_types: ['dine_in', 'takeaway'],
          licenses: ['food_service', 'health_safety'],
        },
        service_radius: 5.0,
      });

      await Verification.create({
        user_id: user.id,
        method: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_METHODS.DOCUMENT_UPLOAD,
        status: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING,
        document_type: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_DOCUMENT_TYPES.BUSINESS_LICENSE,
        document_url: 'placeholder_url',
      });
    } else if (roleName === 'customer') {
      await Customer.create({
        user_id: user.id,
        phone_number: phone,
        address: address || 'Blantyre, Malawi',
        country: country || 'MWI',
      });
    } else if (roleName === 'driver') {
      await Driver.create({
        user_id: user.id,
        name: `${first_name} ${last_name}`,
        phone_number: phone,
        vehicle_info: vehicle_info || { type: 'car' },
        license_number: license_number || `LIC-${user.id}`,
      });

      await Verification.create({
        user_id: user.id,
        method: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_METHODS.DOCUMENT_UPLOAD,
        status: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_STATUSES.PENDING,
        document_type: authConstants.VERIFICATION_CONSTANTS.VERIFICATION_DOCUMENT_TYPES.DRIVERS_LICENSE,
        document_url: 'placeholder_url',
      });
    } else if (roleName === 'admin') {
      await Admin.create({
        user_id: user.id,
        role_id: roleRecord.id,
        email,
        phone_number: phone,
        country_code: country || 'MWI',
        permissions: permissions || authConstants.RBAC_CONSTANTS.ROLE_PERMISSIONS.admin,
      });
    } else if (roleName === 'staff') {
      const validStaffTypes = staff_types?.every((type) => require('@constants/staff/staffConstants').STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES.includes(type));
      if (!validStaffTypes) {
        throw new AppError('Invalid staff type', 400, authConstants.ERROR_CODES.INVALID_STAFF_TYPE);
      }
      await Staff.create({
        user_id: user.id,
        merchant_id: userData.merchant_id || null,
        staff_types: staff_types || ['general'],
      });
    }

    await AuditLog.create({
      user_id: user.id,
      log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.USER_REGISTRATION,
      details: { role: roleName, email },
    });

    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.USER_REGISTRATION, { userId: user.id, role: roleName });
    return user;
  } catch (error) {
    logger.logErrorEvent('Register user failed', { error: error.message });
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email or phone already in use', 400, authConstants.ERROR_CODES.DUPLICATE_USER);
    }
    throw error;
  }
};

const loginUser = async (email, password, deviceInfo, roleName, mfaCode) => {
  try {
    const include = [
      { model: Role, as: 'role', where: { name: roleName } },
      { model: Merchant, as: 'merchant_profile' },
      { model: Customer, as: 'customer_profile' },
      { model: Driver, as: 'driver_profile' },
      { model: Admin, as: 'admin_profile' },
      { model: Staff, as: 'staff_profile' },
    ];

    const user = await User.findOne({
      where: { email },
      include,
      attributes: {
        include: ['password', 'two_factor_secret', 'mfa_status', 'failed_login_attempts', 'lockout_until'],
      },
    });

    if (!user || user.role.name !== roleName) {
      throw new AppError('Invalid credentials', 401, authConstants.ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.lockout_until && new Date(user.lockout_until) > new Date()) {
      throw new AppError('Account locked', 403, authConstants.ERROR_CODES.ACCOUNT_LOCKED);
    }

    const isValid = user.valid_password(password);
    if (!isValid) {
      await user.increment('failed_login_attempts');
      if (user.failed_login_attempts + 1 >= authConstants.SESSION_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
        await user.update({
          lockout_until: new Date(Date.now() + authConstants.SESSION_CONSTANTS.LOCKOUT_DURATION_MINUTES * 60 * 1000),
        });
      }
      throw new AppError('Invalid credentials', 401, authConstants.ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.status !== authConstants.USER_STATUSES.ACTIVE) {
      throw new AppError('User account is inactive', 403, authConstants.ERROR_CODES.ACCOUNT_INACTIVE);
    }

    if (!user.is_verified && roleName !== 'admin') {
      throw new AppError('Please verify your account', 403, authConstants.ERROR_CODES.ACCOUNT_UNVERIFIED);
    }

    if (user.mfa_status === authConstants.MFA_CONSTANTS.MFA_STATUSES.ENABLED && mfaCode) {
      let isMfaValid = false;
      if (user.mfa_method === authConstants.MFA_CONSTANTS.MFA_METHODS.AUTH_APP) {
        isMfaValid = speakeasy.totp.verify({
          secret: user.two_factor_secret,
          encoding: 'base32',
          token: mfaCode,
          window: 1,
        });
      } else if (user.mfa_method === authConstants.MFA_CONSTANTS.MFA_METHODS.SMS || user.mfa_method === authConstants.MFA_CONSTANTS.MFA_METHODS.EMAIL) {
        isMfaValid = true; // Placeholder for SMS/Email OTP verification
      } else if (user.mfa_method === authConstants.MFA_CONSTANTS.MFA_METHODS.BIOMETRIC) {
        isMfaValid = true; // Placeholder for biometric verification
      }
      if (!isMfaValid) {
        await AuditLog.create({
          user_id: user.id,
          log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT,
          details: { success: false, method: user.mfa_method },
        });
        throw new AppError('Invalid MFA code', 401, authConstants.ERROR_CODES.MFA_FAILED);
      }
    }

    await user.update({ failed_login_attempts: 0, last_login_at: new Date() });

    const { accessToken, refreshToken } = await TokenService.generateTokens(user, deviceInfo);

    await AuditLog.create({
      user_id: user.id,
      log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN,
      details: { role: roleName, device_id: deviceInfo?.device_id },
    });

    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN, { userId: user.id, role: roleName });
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
      device_id: deviceInfo?.device_id,
      deviceType,
      platform,
    });

    await AuditLog.create({
      user_id: user.id,
      log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN,
      details: { method: 'google_oauth', device_id: deviceInfo?.device_id },
    });

    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN, { userId: user.id, role: user.role?.name });
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
        { model: Admin, as: 'admin_profile' },
        { model: Staff, as: 'staff_profile' },
      ],
    });
    if (!user) throw new AppError('User not found', 404, authConstants.ERROR_CODES.USER_NOT_FOUND);

    const { accessToken, refreshToken: newRefreshToken } = await TokenService.generateTokens(user, null, authConstants.TOKEN_CONSTANTS.TOKEN_TYPES.REFRESH);

    await AuditLog.create({
      user_id: user.id,
      log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.TOKEN_ISSUANCE,
      details: { token_type: authConstants.TOKEN_CONSTANTS.TOKEN_TYPES.REFRESH },
    });

    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.TOKEN_ISSUANCE, { userId: user.id });
    return { accessToken, refreshToken: newRefreshToken };
  } catch (error) {
    logger.logErrorEvent('Refresh token failed', { error: error.message });
    throw new AppError('Invalid refresh token', 401, authConstants.ERROR_CODES.TOKEN_INVALID);
  }
};

const verifyMfa = async (userId, mfaCode, mfaMethod) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['two_factor_secret', 'mfa_status', 'mfa_method', 'mfa_backup_codes'],
    });
    if (!user) throw new AppError('User not found', 404, authConstants.ERROR_CODES.USER_NOT_FOUND);
    if (user.mfa_status !== authConstants.MFA_CONSTANTS.MFA_STATUSES.ENABLED) {
      throw new AppError('MFA not enabled', 400, authConstants.ERROR_CODES.MFA_FAILED);
    }

    let isValid = false;
    if (mfaMethod === authConstants.MFA_CONSTANTS.MFA_METHODS.AUTH_APP) {
      isValid = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: mfaCode,
        window: 1,
      });
    } else if (mfaMethod === authConstants.MFA_CONSTANTS.MFA_METHODS.SMS || mfaMethod === authConstants.MFA_CONSTANTS.MFA_METHODS.EMAIL) {
      isValid = true; // Placeholder for SMS/Email OTP verification
    } else if (mfaMethod === authConstants.MFA_CONSTANTS.MFA_METHODS.BIOMETRIC) {
      isValid = true; // Placeholder for biometric verification
    }

    if (!isValid && user.mfa_backup_codes?.includes(mfaCode)) {
      isValid = true;
      user.mfa_backup_codes = user.mfa_backup_codes.filter((code) => code !== mfaCode);
      await user.save();
    }

    if (!isValid) {
      await AuditLog.create({
        user_id: userId,
        log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT,
        details: { success: false, method: mfaMethod },
      });
      throw new AppError('Invalid MFA code', 401, authConstants.ERROR_CODES.MFA_FAILED);
    }

    await user.update({ mfa_status: authConstants.MFA_CONSTANTS.MFA_STATUSES.ENABLED });

    await AuditLog.create({
      user_id: userId,
      log_type: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT,
      details: { success: true, method: mfaMethod },
    });

    logger.logSecurityEvent(authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT, { userId, success: true });
    return { success: true };
  } catch (error) {
    logger.logErrorEvent('MFA verification failed', { error: error.message });
    throw error;
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleOAuthLogin,
  logoutUser: TokenService.logoutUser,
  refreshToken,
  verifyMfa,
};