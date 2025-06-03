'use strict';

const express = require('express');
const {
  register,
  registerNonCustomer,
  login,
  logout,
  refresh,
  verifyMfa,
} = require('@controllers/common/authController');
const {
  validate,
  registerValidations,
  registerNonCustomerValidations,
  loginValidations,
  logoutValidations,
  refreshTokenValidations,
  verifyMfaValidations,
} = require('@validators/common/authValidator');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const { rateLimiters } = require('@utils/rateLimiter');
const authConstants = require('@constants/common/authConstants');

const router = express.Router();

router.post('/register', rateLimiters.general, registerValidations, validate, register);
router.post(
  '/register-non-customer',
  rateLimiters.auth,
  authenticate,
  restrictTo(authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes('admin') ? 'admin' : []),
  registerNonCustomerValidations,
  validate,
  registerNonCustomer
);
router.post(
  '/login/admin',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login({ ...req, body: { ...req.body, role: authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes('admin') ? 'admin' : '' } }, res, next)
);
router.post(
  '/login/customer',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login({ ...req, body: { ...req.body, role: authConstants.AUTH_SETTINGS.DEFAULT_ROLE } }, res, next)
);
router.post(
  '/login/driver',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login({ ...req, body: { ...req.body, role: authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes('driver') ? 'driver' : '' } }, res, next)
);
router.post(
  '/login/merchant',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login({ ...req, body: { ...req.body, role: authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes('merchant') ? 'merchant' : '' } }, res, next)
);
router.post(
  '/login/staff',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login({ ...req, body: { ...req.body, role: authConstants.AUTH_SETTINGS.SUPPORTED_ROLES.includes('staff') ? 'staff' : '' } }, res, next)
);
router.post('/logout', rateLimiters.general, authenticate, logoutValidations, validate, logout);
router.post('/refresh', rateLimiters.general, refreshTokenValidations, validate, refresh);
router.post('/verify-mfa', rateLimiters.auth, verifyMfaValidations, validate, verifyMfa);

module.exports = router;