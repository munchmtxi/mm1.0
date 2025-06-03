'use strict';

const catchAsync = require('@utils/catchAsync');
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  googleOAuthLogin,
  verifyMfa,
} = require('@services/common/authService');
const {
  handleLogin,
  handleLogout,
  handleMfaEnabled,
  handleMfaVerified,
} = require('@socket/handlers');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const authConstants = require('@constants/common/authConstants');
const config = require('@config/config');
const { User, Role } = require('@models');

module.exports = {
  register: catchAsync(async (req, res, next) => {
    const { role, mfa_method } = req.body;
    if (role && role !== authConstants.AUTH_SETTINGS.DEFAULT_ROLE) {
      throw new AppError('Only customers can self-register', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    logger.logApiEvent('Customer register attempt', { email: req.body.email });
    const user = await registerUser(req.body);
    const userRole = user.role_id ? (await user.getRole()).name : authConstants.AUTH_SETTINGS.DEFAULT_ROLE;
    if (mfa_method && authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(userRole)) {
      handleMfaEnabled(req.io, { id: user.id, role: userRole }, mfa_method);
    }
    res.status(201).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES.USER_REGISTERED,
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: userRole,
      },
    });
  }),

  registerNonCustomer: catchAsync(async (req, res, next) => {
    logger.logApiEvent('Non-customer register attempt', { email: req.body.email, role: req.body.role });
    if (!authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes(req.user.role)) {
      throw new AppError('Only admins can register non-customers', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    const user = await registerUser(req.body, true);
    const userRole = user.role_id ? (await user.getRole()).name : req.body.role;
    if (req.body.mfa_method && authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(userRole)) {
      handleMfaEnabled(req.io, { id: user.id, role: userRole }, req.body.mfa_method);
    }
    res.status(201).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES.USER_REGISTERED,
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: userRole,
      },
    });
  }),

  login: catchAsync(async (req, res, next) => {
    const { email, password, deviceId, deviceType, role, mfaCode } = req.body;
    logger.logApiEvent('Login attempt', { email, role });
    const deviceInfo = deviceId ? { deviceId, deviceType } : null;
    const { user, accessToken, refreshToken } = await loginUser(email, password, deviceInfo, role, mfaCode);
    handleLogin(req.io, { id: user.id, role: user.role.name });
    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES.LOGIN_SUCCESS,
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role.name,
          profile:
            user.role.name === 'merchant' ? user.merchant_profile :
            user.role.name === 'customer' ? user.customer_profile :
            user.role.name === 'driver' ? user.driver_profile :
            user.role.name === 'admin' ? user.admin_profile :
            user.role.name === 'staff' ? user.staff_profile : null,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  }),

  logout: catchAsync(async (req, res, next) => {
    const { device_id, clear_all_devices } = req.body;
    logger.logApiEvent('Logout attempt', { userId: req.user.id });
    await logoutUser(req.user.id, device_id, clear_all_devices);
    handleLogout(req.io, req.user, device_id, clear_all_devices);
    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES.SESSION_TERMINATED,
    });
  }),

  refresh: catchAsync(async (req, res, next) => {
    const { refresh_token } = req.body;
    logger.logApiEvent('Token refresh attempt');
    const { accessToken, refreshToken: newRefreshToken } = await refreshToken(refresh_token);
    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES.TOKEN_REFRESHED,
      data: {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      },
    });
  }),

  googleOAuth: catchAsync(async (req, res, next) => {
    next();
  }),

  googleOAuthCallback: catchAsync(async (req, res, next) => {
    logger.logApiEvent('Google OAuth callback', { userId: req.user.id });
    const { user, accessToken, refreshToken } = await googleOAuthLogin(
      {
        id: req.user.id,
        role: req.user.role,
        role_id: req.user.roleId,
      },
      req.query.device_id ? { device_id: req.query.device_id, device_type: req.query.device_type || 'web' } : null
    );
    handleLogin(req.io, { id: user.id, role: user.role }, true);
    const redirectUrl = new URL(config.frontendUrl || 'http://localhost:5173');
    redirectUrl.pathname = '/auth/callback';
    redirectUrl.searchParams.set('access_token', accessToken);
    redirectUrl.searchParams.set('refresh_token', refreshToken);
    redirectUrl.searchParams.set('user_id', user.id);
    redirectUrl.searchParams.set('role', user.role);
    res.redirect(redirectUrl.toString());
  }),

  verifyMfa: catchAsync(async (req, res, next) => {
    const { user_id, mfa_code, mfa_method } = req.body;
    logger.logApiEvent('MFA verification attempt', { userId: user_id });
    const result = await verifyMfa(user_id, mfa_code, mfa_method);
    const user = await User.findByPk(user_id, { include: [{ model: Role, as: 'role' }] });
    handleMfaVerified(req.io, { id: user.id, role: user.role.name }, mfa_method);
    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES.MFA_ENABLED,
      data: result,
    });
  }),
};