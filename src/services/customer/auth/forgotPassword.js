'use strict';
const { User, PasswordResetLog } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/customer/customerAuthConstants');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const { Op } = require('sequelize');

async function requestPasswordReset(email, ip_address) {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const resetToken = uuidv4();
    const expires = new Date(Date.now() + authConstants.SECURITY.TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await User.update(
      { password_reset_token: resetToken, password_reset_expires: expires },
      { where: { id: user.id } }
    );

    const transporter = nodemailer.createTransport({
      service: 'SendGrid',
      auth: { user: process.env.SENDGRID_USERNAME, pass: process.env.SENDGRID_API_KEY },
    });
    await transporter.sendMail({
      to: email,
      from: process.env.EMAIL_FROM,
      subject: 'Password Reset Request',
      text: `Use this token to reset your password: ${resetToken}. It expires at ${expires.toISOString()}`,
    });

    await PasswordResetLog.create({
      user_id: user.id,
      user_type: 'customer',
      status: 'success',
      ip_address,
    });

    logger.logSecurityEvent('Password reset requested', { userId: user.id, email });
    return { message: 'Password reset email sent' };
  } catch (error) {
    logger.error('Password reset request error', { error: error.message });
    await PasswordResetLog.create({
      user_id: null,
      user_type: 'customer',
      status: 'failed',
      ip_address,
    });
    throw new AppError(error.message || 'Password reset request failed', error.statusCode || 500, 'RESET_REQUEST_FAILED', error.message);
  }
}

async function resetPassword(email, token, newPassword, ip_address) {
  try {
    const user = await User.findOne({
      where: { email, password_reset_token: token, password_reset_expires: { [Op.gt]: new Date() } },
    });
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    await User.update(
      { password: newPassword, password_reset_token: null, password_reset_expires: null, last_password_change: new Date() },
      { where: { id: user.id } }
    );

    await PasswordResetLog.create({
      user_id: user.id,
      user_type: 'customer',
      status: 'success',
      ip_address,
    });

    logger.logSecurityEvent('Password reset successful', { userId: user.id, email });
    return { message: 'Password reset successful' };
  } catch (error) {
    logger.error('Password reset error', { error: error.message });
    await PasswordResetLog.create({
      user_id: null,
      user_type: 'customer',
      status: 'failed',
      ip_address,
    });
    throw new AppError(error.message || 'Password reset failed', error.statusCode || 500, 'RESET_FAILED', error.message);
  }
}

module.exports = {
  requestPasswordReset,
  resetPassword,
};