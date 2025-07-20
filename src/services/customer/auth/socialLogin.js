'use strict';
const passport = require('passport');
const { User, Role } = require('@models');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const authConstants = require('@constants/customer/customerAuthConstants');
const jwt = require('jsonwebtoken');

async function googleLogin(req, res, next) {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
}

async function googleCallback(req, res, next) {
  passport.authenticate('google', async (err, userData) => {
    if (err) {
      logger.error('Google OAuth error', { error: err.message });
      return next(new AppError('Google authentication failed', 401, 'GOOGLE_AUTH_FAILED'));
    }
    if (!userData) {
      return next(new AppError('No user data from Google', 401, 'NO_USER_DATA'));
    }

    try {
      const user = await User.findByPk(userData.id, {
        include: [{ model: Role, as: 'role' }],
      });
      const token = jwt.sign(
        { id: user.id, role: user.role.name },
        authConstants.SECURITY.JWT.SECRET,
        { expiresIn: authConstants.SECURITY.JWT.EXPIRES_IN }
      );
      logger.logSecurityEvent('Google login successful', { userId: user.id });
      res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role.name } });
    } catch (error) {
      logger.error('Google callback error', { error: error.message });
      next(new AppError('Authentication error', 500, 'AUTH_ERROR', error.message));
    }
  })(req, res, next);
}

module.exports = {
  googleLogin,
  googleCallback,
};