'use strict';

const express = require('express');
const {
  register,
  registerNonCustomer,
  login,
  logout,
  refresh,
} = require('@controllers/common/authController');
const {
  validate,
  registerValidations,
  registerNonCustomerValidations,
  loginValidations,
  logoutValidations,
  refreshTokenValidations,
} = require('@validators/common/authValidator');
const { authenticate, restrictTo } = require('@middleware/common/authMiddleware');
const { rateLimiters } = require('@utils/rateLimiter');
const authConstants = require('@constants/common/authConstants');

const router = express.Router();

router.post(
  '/register',
  rateLimiters.general,
  registerValidations,
  validate,
  register
);
router.post(
  '/register-non-customer',
  rateLimiters.auth,
  authenticate,
  restrictTo(authConstants.ROLES.ADMIN),
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
    login(
      { ...req, body: { ...req.body, role: authConstants.ROLES.ADMIN } },
      res,
      next
    )
);
router.post(
  '/login/customer',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login(
      { ...req, body: { ...req.body, role: authConstants.ROLES.CUSTOMER } },
      res,
      next
    )
);
router.post(
  '/login/driver',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login(
      { ...req, body: { ...req.body, role: authConstants.ROLES.DRIVER } },
      res,
      next
    )
);
router.post(
  '/login/merchant',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) =>
    login(
      { ...req, body: { ...req.body, role: authConstants.ROLES.MERCHANT } },
      res,
      next
    )
);
router.post(
  '/logout',
  rateLimiters.general,
  authenticate,
  logoutValidations,
  validate,
  logout
);
router.post(
  '/refresh',
  rateLimiters.general,
  refreshTokenValidations,
  validate,
  refresh
);

module.exports = router;