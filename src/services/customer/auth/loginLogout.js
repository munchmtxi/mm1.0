'use strict';
const { User, Customer, Device } = require('@models'); // Explicitly import Device
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/customer/customerAuthConstants');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function login(email, password, deviceInfo) {
  try {
    const user = await User.findOne({
      where: { email },
      include: [{ model: Customer, as: 'customer_profile' }],
    });
    if (!user || !user.valid_password(password)) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }
    if (user.status !== authConstants.AUTH.STATUS.ACTIVE) {
      throw new AppError('Account inactive', 403, 'ACCOUNT_INACTIVE');
    }

    await User.update(
      { last_login_at: new Date(), failed_login_attempts: 0 },
      { where: { id: user.id } }
    );

    await Device.create({
      user_id: user.id,
      device_id: deviceInfo.device_id,
      device_type: deviceInfo.device_type,
      platform: deviceInfo.platform,
      last_active_at: new Date(),
    });

    const token = jwt.sign(
      { id: user.id, role: authConstants.AUTH.ROLES.CUSTOMER },
      authConstants.SECURITY.JWT.SECRET,
      { expiresIn: authConstants.SECURITY.JWT.EXPIRES_IN }
    );

    logger.logSecurityEvent('User login successful', { userId: user.id, email });
    return { token, user: { id: user.id, email, role: authConstants.AUTH.ROLES.CUSTOMER } };
  } catch (error) {
    if (error.statusCode === 401) {
      await User.increment('failed_login_attempts', { where: { email } });
    }
    logger.error('Login error', { error: error.message });
    throw new AppError(error.message || 'Login failed', error.statusCode || 500, 'LOGIN_FAILED', error.message);
  }
}

async function logout(userId, deviceId) {
  try {
    const device = await Device.findOne({ where: { user_id: userId, device_id: deviceId } });
    if (!device) {
      throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
    }

    await Device.update(
      { refresh_token: null, refresh_token_expires_at: null, last_active_at: new Date() },
      { where: { user_id: userId, device_id: deviceId } }
    );

    logger.logSecurityEvent('User logout successful', { userId, deviceId });
    return true;
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    throw new AppError('Logout failed', 500, 'LOGOUT_FAILED', error.message);
  }
}

module.exports = {
  login,
  logout,
};