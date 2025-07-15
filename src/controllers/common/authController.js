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
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const authConstants = require('@constants/common/authConstants');
const config = require('@config/config');
const { User, Role } = require('@models');

module.exports = {
  register: catchAsync(async (req, res, next) => {
    const { role, mfa_method, email } = req.body;
    if (role && role !== authConstants.AUTH_SETTINGS.DEFAULT_ROLE) {
      throw new AppError('Only customers can self-register', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    logger.logApiEvent('Customer register attempt', { email });
    const user = await registerUser(req.body);
    const userRole = user.role_id ? (await user.getRole()).name : authConstants.AUTH_SETTINGS.DEFAULT_ROLE;

    await auditService.logAction({
      userId: user.id,
      role: userRole,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.USER_REGISTRATION,
      details: { email, role: userRole },
      ipAddress: req.ip || '0.0.0.0',
    });

    if (mfa_method && authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(userRole)) {
      await socketService.emit(req.io, 'user:mfa_enabled', {
        userId: user.id,
        role: userRole,
        mfaMethod: mfa_method,
        auditAction: 'MFA_ENABLED',
      }, `role:${userRole}`);
      await notificationService.sendNotification({
        userId: user.id,
        notificationType: 'AUTH',
        messageKey: 'mfa_enabled',
        deliveryMethod: 'email',
        role: userRole,
      });
    }

    await notificationService.sendNotification({
      userId: user.id,
      notificationType: 'AUTH',
      messageKey: 'user_registered',
      deliveryMethod: 'email',
      role: userRole,
    });

    res.status(201).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES[0], // USER_REGISTERED
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
    const { email, role, mfa_method } = req.body;
    logger.logApiEvent('Non-customer register attempt', { email, role });
    if (!authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes(req.user.role)) {
      throw new AppError('Only admins can register non-customers', 403, authConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    const user = await registerUser(req.body, true);
    const userRole = user.role_id ? (await user.getRole()).name : role;

    await auditService.logAction({
      userId: user.id,
      role: userRole,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.USER_REGISTRATION,
      details: { email, role: userRole, registeredBy: req.user.id },
      ipAddress: req.ip || '0.0.0.0',
    });

    if (mfa_method && authConstants.MFA_CONSTANTS.MFA_REQUIRED_ROLES.includes(userRole)) {
      await socketService.emit(req.io, 'user:mfa_enabled', {
        userId: user.id,
        role: userRole,
        mfaMethod: mfa_method,
        auditAction: 'MFA_ENABLED',
      }, `role:${userRole}`);
      await notificationService.sendNotification({
        userId: user.id,
        notificationType: 'AUTH',
        messageKey: 'mfa_enabled',
        deliveryMethod: 'email',
        role: userRole,
      });
    }

    await notificationService.sendNotification({
      userId: user.id,
      notificationType: 'AUTH',
      messageKey: 'user_registered',
      deliveryMethod: 'email',
      role: userRole,
    });

    res.status(201).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES[0], // USER_REGISTERED
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
    const deviceInfo = deviceId ? { device_id: deviceId, deviceType } : null;
    const { user, accessToken, refreshToken } = await loginUser(email, password, deviceInfo, role, mfaCode);

    await socketService.emit(req.io, role === 'customer' ? 'user:login' : 'user:login', {
      userId: user.id,
      role: user.role.name,
      auditAction: 'LOGIN',
    }, `role:${user.role.name}`);

    await auditService.logAction({
      userId: user.id,
      role: user.role.name,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN,
      details: { email, role: user.role.name, deviceId },
      ipAddress: req.ip || '0.0.0.0',
    });

    await notificationService.sendNotification({
      userId: user.id,
      notificationType: 'AUTH',
      messageKey: 'user_logged_in',
      deliveryMethod: 'email',
      role: user.role.name,
    });

    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES[0], // USER_LOGGED_IN
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

    await socketService.emit(req.io, 'user:logout', {
      userId: req.user.id,
      role: req.user.role,
      deviceId: device_id,
      clearAllDevices: clear_all_devices,
      auditAction: 'LOGOUT',
    }, `role:${req.user.role}`);

    await auditService.logAction({
      userId: req.user.id,
      role: req.user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGOUT,
      details: { deviceId: device_id, clearAllDevices: clear_all_devices },
      ipAddress: req.ip || '0.0.0.0',
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: 'AUTH',
      messageKey: 'session_terminated',
      deliveryMethod: 'email',
      role: req.user.role,
    });

    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES[5], // SESSION_TERMINATED
    });
  }),

  refresh: catchAsync(async (req, res, next) => {
    const { refresh_token } = req.body;
    logger.logApiEvent('Token refresh attempt');
    const { accessToken, refreshToken: newRefreshToken } = await refreshToken(refresh_token);

    await socketService.emit(req.io, 'user:token_refreshed', {
      userId: req.user.id,
      role: req.user.role,
      auditAction: 'TOKEN_ISSUANCE',
    }, `role:${req.user.role}`);

    await auditService.logAction({
      userId: req.user.id,
      role: req.user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.TOKEN_ISSUANCE,
      details: { tokenType: authConstants.TOKEN_CONSTANTS.TOKEN_TYPES.REFRESH },
      ipAddress: req.ip || '0.0.0.0',
    });

    await notificationService.sendNotification({
      userId: req.user.id,
      notificationType: 'AUTH',
      messageKey: 'token_refreshed',
      deliveryMethod: 'email',
      role: req.user.role,
    });

    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES[1], // TOKEN_REFRESHED
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
    const deviceInfo = req.query.device_id ? { device_id: req.query.device_id, device_type: req.query.device_type || 'web' } : null;
    const { user, accessToken, refreshToken } = await googleOAuthLogin(
      {
        id: req.user.id,
        role: req.user.role,
        role_id: req.user.roleId,
      },
      deviceInfo
    );

    await socketService.emit(req.io, 'user:google_login', {
      userId: user.id,
      role: user.role,
      auditAction: 'LOGIN',
    }, `role:${user.role}`);

    await auditService.logAction({
      userId: user.id,
      role: user.role,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.LOGIN,
      details: { method: 'google_oauth', deviceId: deviceInfo?.device_id },
      ipAddress: req.ip || '0.0.0.0',
    });

    await notificationService.sendNotification({
      userId: user.id,
      notificationType: 'AUTH',
      messageKey: 'user_logged_in',
      deliveryMethod: 'email',
      role: user.role,
    });

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

    await socketService.emit(req.io, 'user:mfa_verified', {
      userId: user.id,
      role: user.role.name,
      mfaMethod: mfa_method,
      auditAction: 'MFA_ATTEMPT',
    }, `role:${user.role.name}`);

    await auditService.logAction({
      userId: user.id,
      role: user.role.name,
      action: authConstants.AUDIT_LOG_CONSTANTS.LOG_TYPES.MFA_ATTEMPT,
      details: { mfaMethod: mfa_method, success: true },
      ipAddress: req.ip || '0.0.0.0',
    });

    await notificationService.sendNotification({
      userId: user.id,
      notificationType: 'AUTH',
      messageKey: 'mfa_verified',
      deliveryMethod: 'email',
      role: user.role.name,
    });

    res.status(200).json({
      status: 'success',
      message: authConstants.SUCCESS_MESSAGES[2], // MFA_ENABLED
      data: result,
    });
  }),
};