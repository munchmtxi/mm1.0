// tokenService.js
'use strict';

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Session, Device, Role } = require('@models');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const jwtConfig = require('@config/jwtConfig');
const authConstants = require('@constants/common/authConstants');

class TokenService {
  async generateTokens(user, deviceInfo = {}) {
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

      // Store Session
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const session = await Session.create({
            userId: user.id,
            token: accessToken,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          logger.info('Session stored', { userId: user.id, sessionId: session.id, token: accessToken.substring(0, 20) + '...' });
          break;
        } catch (error) {
          logger.warn('Session storage attempt failed', { userId: user.id, attempt, error: error.message });
          if (attempt === 3) throw new AppError('Failed to store session', 500, 'SESSION_STORAGE_FAILED');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
  
    logger.logSecurityEvent('Tokens generated', { userId: user.id, role: roleName });
    return { accessToken, refreshToken };
  }

  async verifyToken(token) {
    try {
      const payload = jwt.verify(token, jwtConfig.secretOrKey);
      const session = await Session.findOne({
        where: { userId: payload.id, token, isActive: true },
      });
      if (!session) {
        logger.warn('Session not found or inactive', { userId: payload.id });
        throw new AppError('Invalid or expired session', 401, 'INVALID_SESSION');
      }
      logger.info('Token verified', { userId: payload.id });
      return payload;
    } catch (error) {
      logger.error('Error verifying token', { error: error.message, stack: error.stack });
      if (error.name === 'JsonWebTokenError') throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      if (error.name === 'TokenExpiredError') throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      throw new AppError('Failed to verify token', 500, 'TOKEN_VERIFICATION_FAILED');
    }
  }

  async logoutUser(userId, deviceId, clearAllDevices) {
    try {
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
        await Session.update(
          { isActive: false, updatedAt: new Date() },
          { where: { userId, token: (await Device.findOne({ where: { user_id: userId, device_id: deviceId } }))?.refresh_token }}
        );
      }
      logger.logSecurityEvent('User logged out', { userId, deviceId, clearAllDevices });
    } catch (error) {
      logger.error('Error during logout', { error: error.message, stack: error.stack });
      throw new AppError('Failed to logout user', 500, 'LOGOUT_FAILED');
    }
  }

  // Deprecated methods (kept for compatibility)
  async generateAccessToken(user) {
    logger.warn('Using deprecated generateAccessToken', { userId: user.id });
    return this.generateTokens(user, { deviceId: user.deviceId, deviceType: user.deviceType });
  }

  async revokeToken(token) {
    try {
      const [updated] = await Session.update(
        { isActive: false, updatedAt: new Date() },
        { where: { token, isActive: true } }
      );
      if (updated) {
        logger.info('Token revoked', { token: token.substring(0, 20) + '...' });
      } else {
        logger.warn('No active session found to revoke', { token: token.substring(0, 20) + '...' });
      }
    } catch (error) {
      logger.error('Error revoking token', { error: error.message, stack: error.stack });
      throw new AppError('Failed to revoke token', 500, 'TOKEN_REVOCATION_FAILED');
    }
  }
}

module.exports = new TokenService();