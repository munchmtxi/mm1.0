'use strict';
const speakeasy = require('speakeasy');
const { User, mfaTokens } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/customer/customerAuthConstants');

async function generate2FASecret(userId) {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const secret = speakeasy.generateSecret({ name: `MunchMtxi:${user.email}` });
    await User.update(
      { two_factor_secret: secret.base32, mfa_method: 'AUTH_APP', mfa_status: 'PENDING' },
      { where: { id: userId } }
    );

    logger.logSecurityEvent('2FA secret generated', { userId });
    return { secret: secret.base32, otpauth_url: secret.otpauth_url };
  } catch (error) {
    logger.error('2FA secret generation error', { error: error.message });
    throw new AppError('2FA setup failed', 500, '2FA_SETUP_FAILED', error.message);
  }
}

async function verify2FAToken(userId, token) {
  try {
    const user = await User.findByPk(userId);
    if (!user || !user.two_factor_secret) {
      throw new AppError('2FA not set up for user', 400, '2FA_NOT_CONFIGURED');
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
    });

    if (!verified) {
      throw new AppError('Invalid 2FA token', 401, 'INVALID_2FA_TOKEN');
    }

    await User.update({ mfa_status: 'ENABLED' }, { where: { id: userId } });
    await mfaTokens.create({
      user_id: userId,
      token,
      method: 'AUTH_APP',
      expires_at: new Date(Date.now() + authConstants.SECURITY.TOKEN_EXPIRY_MINUTES * 60 * 1000),
    });

    logger.logSecurityEvent('2FA token verified', { userId });
    return true;
  } catch (error) {
    logger.error('2FA verification error', { error: error.message });
    throw new AppError(error.message || '2FA verification failed', error.statusCode || 401, '2FA_VERIFICATION_FAILED', error.message);
  }
}

async function disable2FA(userId) {
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

    logger.logSecurityEvent('2FA disabled', { userId });
    return true;
  } catch (error) {
    logger.error('2FA disable error', { error: error.message });
    throw new AppError('2FA disable failed', 500, '2FA_DISABLE_FAILED', error.message);
  }
}

module.exports = {
  generate2FASecret,
  verify2FAToken,
  disable2FA,
};