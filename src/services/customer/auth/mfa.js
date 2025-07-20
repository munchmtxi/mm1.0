'use strict';
const speakeasy = require('speakeasy');
const { User, mfaTokens } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/customer/customerAuthConstants');

async function setupMFA(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const secret = speakeasy.generateSecret({ name: `MunchMtxi:${user.email}` });
    await User.update(
      { two_factor_secret: secret.base32, mfa_method: 'AUTH_APP', mfa_status: 'ENABLED' },
      { where: { id: userId } }
    );

    logger.logSecurityEvent('MFA setup initiated', { userId });
    return { secret: secret.base32, otpauth_url: secret.otpauth_url };
  } catch (error) {
    logger.error('MFA setup error', { error: error.message });
    throw new AppError('MFA setup failed', 500, 'MFA_SETUP_FAILED', error.message);
  }
}

async function verifyMFA(userId, token, method = 'AUTH_APP') {
  try {
    const user = await User.findByPk(userId);
    if (!user || !user.two_factor_secret) {
      throw new AppError('MFA not set up for user', 400, 'MFA_NOT_CONFIGURED');
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new AppError('Invalid MFA token', 401, 'INVALID_MFA_TOKEN');
    }

    await mfaTokens.create({
      user_id: userId,
      token,
      method,
      expires_at: new Date(Date.now() + authConstants.SECURITY.TOKEN_EXPIRY_MINUTES * 60 * 1000),
    });

    logger.logSecurityEvent('MFA verified', { userId });
    return true;
  } catch (error) {
    logger.error('MFA verification error', { error: error.message });
    throw new AppError(error.message || 'MFA verification failed', error.statusCode || 401, 'MFA_VERIFICATION_FAILED', error.message);
  }
}

async function disableMFA(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    await User.update(
      { two_factor_secret: null, mfa_method: null, mfa_status: 'DISABLED' },
      { where: { id: userId } }
    );
    await mfaTokens.destroy({ where: { user_id: userId } });

    logger.logSecurityEvent('MFA disabled', { userId });
    return true;
  } catch (error) {
    logger.error('MFA disable error', { error: error.message });
    throw new AppError('MFA disable failed', 500, 'MFA_DISABLE_FAILED', error.message);
  }
}

module.exports = {
  setupMFA,
  verifyMFA,
  disableMFA,
};