'use strict';

const catchAsync = require('@utils/catchAsync');
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  googleOAuthLogin,
} = require('@services/common/authService');
const socketService = require('@services/common/socketService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const authConstants = require('@constants/common/authConstants');
const config = require('@config/config');

module.exports = {
  register: catchAsync(async (req, res, next) => {
    const { role } = req.body;
    if (role && role !== authConstants.ROLES.CUSTOMER) {
      throw new AppError('Only customers can self-register', 403, 'UNAUTHORIZED');
    }
    logger.logApiEvent('Customer register attempt', { email: req.body.email });
    const user = await registerUser(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role_id ? (await user.getRole()).name : authConstants.ROLES.CUSTOMER,
      },
    });
  }),
  
  registerNonCustomer: catchAsync(async (req, res, next) => {
    logger.logApiEvent('Non-customer register attempt', {
      email: req.body.email,
      role: req.body.role,
    });
    if (req.user.role !== authConstants.ROLES.ADMIN) {
      throw new AppError('Only admins can register non-customers', 403, 'UNAUTHORIZED');
    }
    const user = await registerUser(req.body, true);
    res.status(201).json({
      status: 'success',
      data: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role_id ? (await user.getRole()).name : req.body.role,
      },
    });
  }),

  login: catchAsync(async (req, res, next) => {
    const { email, password, deviceId, deviceType, role } = req.body;
    logger.logApiEvent('Login attempt', { email, role });
    const deviceInfo = deviceId ? { deviceId, deviceType } : null;
    const { user, accessToken, refreshToken } = await loginUser(
      email,
      password,
      deviceInfo,
      role
    );
    console.log('authController: Emitting login notification for user:', user.id);
    socketService.emitLoginNotification(req.io, {
      id: user.id,
      role: user.role.name,
    });
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role.name,
          profile:
            user.role.name === authConstants.ROLES.MERCHANT
              ? user.merchant_profile
              : user.role.name === authConstants.ROLES.CUSTOMER
              ? user.customer_profile
              : user.role.name === authConstants.ROLES.DRIVER
              ? user.driver_profile
              : user.role.name === authConstants.ROLES.ADMIN
              ? user.admin_profile
              : user.role.name === authConstants.ROLES.STAFF
              ? user.staff_profile
              : null,
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
    socketService.emitLogoutNotification(req.io, req.user, device_id, clear_all_devices);
    res.status(200).json({
      status: 'success',
      message: 'Successfully logged out',
    });
  }),

  refresh: catchAsync(async (req, res, next) => {
    const { refresh_token } = req.body;
    logger.logApiEvent('Token refresh attempt');
    const { accessToken, refreshToken: newRefreshToken } = await refreshToken(refresh_token);
    res.status(200).json({
      status: 'success',
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
    socketService.emitLoginNotification(req.io, { id: user.id, role: user.role }, true);
    const redirectUrl = new URL(config.frontendUrl || 'http://localhost:5173');
    redirectUrl.pathname = '/auth/callback';
    redirectUrl.searchParams.set('access_token', accessToken);
    redirectUrl.searchParams.set('refresh_token', refreshToken);
    redirectUrl.searchParams.set('user_id', user.id);
    redirectUrl.searchParams.set('role', user.role);
    res.redirect(redirectUrl.toString());
  }),

  // Added loginMerchant endpoint
  loginMerchant: catchAsync(async (req, res, next) => {
    const { email, password, deviceId, deviceType, rememberMe } = req.body;
    logger.logApiEvent('Merchant login attempt', { email });
    const deviceInfo = deviceId ? { deviceId, deviceType } : null;
    const { user, accessToken, refreshToken } = await loginUser(
      email,
      password,
      deviceInfo,
      authConstants.ROLES.MERCHANT
    );
    console.log('authController: Emitting login notification for merchant:', user.id);
    socketService.emitLoginNotification(req.io, {
      id: user.id,
      role: user.role.name,
    });
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role.name,
          profile: user.merchant_profile,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  }),
};