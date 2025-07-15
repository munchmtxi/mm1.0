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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Authentication]
 *     description: Creates a new customer account. Only customers can self-register.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password, country]
 *             properties:
 *               first_name: { type: string, minLength: 2, maxLength: 50 }
 *               last_name: { type: string, minLength: 2, maxLength: 50 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 128 }
 *               phone: { type: string, nullable: true }
 *               country: { type: string, enum: ['MWI', 'US'] }
 *               merchant_type: { type: string, enum: ['grocery', 'restaurant', 'cafe'], nullable: true }
 *               role: { type: string, enum: ['customer'], nullable: true }
 *               mfa_method: { type: string, enum: ['email', 'sms', 'authenticator'], nullable: true }
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully registered' }
 *                 data: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string } } }
 *       400:
 *         description: Validation error
 *       403:
 *         description: Permission denied (non-customer role attempted)
 */
router.post('/register', rateLimiters.general, registerValidations, validate, register);

/**
 * @swagger
 * /auth/register-non-customer:
 *   post:
 *     summary: Register a non-customer user (admin, driver, merchant, staff)
 *     tags: [Authentication]
 *     description: Creates a new non-customer account. Only admins can register non-customers.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [first_name, last_name, email, password, country, role]
 *             properties:
 *               first_name: { type: string, minLength: 2, maxLength: 50 }
 *               last_name: { type: string, minLength: 2, maxLength: 50 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8, maxLength: 128 }
 *               phone: { type: string, nullable: true }
 *               country: { type: string, enum: ['MWI', 'US'] }
 *               merchant_type: { type: string, enum: ['grocery', 'restaurant', 'cafe'], nullable: true }
 *               role: { type: string, enum: ['admin', 'driver', 'merchant', 'staff'] }
 *               mfa_method: { type: string, enum: ['email', 'sms', 'authenticator'], nullable: true }
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully registered' }
 *                 data: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied (non-admin requester)
 */
router.post(
  '/register-non-customer',
  rateLimiters.auth,
  authenticate,
  restrictTo('admin'),
  registerNonCustomerValidations,
  validate,
  registerNonCustomer
);

/**
 * @swagger
 * /auth/login/admin:
 *   post:
 *     summary: Login as admin
 *     tags: [Authentication]
 *     description: Authenticates an admin user and returns JWT tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               device_id: { type: string, nullable: true }
 *               device_type: { type: string, enum: ['desktop', 'mobile', 'tablet', 'unknown'], nullable: true }
 *               platform: { type: string, enum: ['web', 'ios', 'android'], nullable: true }
 *               mfa_code: { type: string, minLength: 6, maxLength: 6, nullable: true }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully logged in' }
 *                 data: { type: object, properties: { user: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string }, profile: { type: object, nullable: true } }, access_token: { type: string }, refresh_token: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/login/admin',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) => login({ ...req, body: { ...req.body, role: 'admin' } }, res, next)
);

/**
 * @swagger
 * /auth/login/customer:
 *   post:
 *     summary: Login as customer
 *     tags: [Authentication]
 *     description: Authenticates a customer user and returns JWT tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               device_id: { type: string, nullable: true }
 *               device_type: { type: string, enum: ['desktop', 'mobile', 'tablet', 'unknown'], nullable: true }
 *               platform: { type: string, enum: ['web', 'ios', 'android'], nullable: true }
 *               mfa_code: { type: string, minLength: 6, maxLength: 6, nullable: true }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully logged in' }
 *                 data: { type: object, properties: { user: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string }, profile: { type: object, nullable: true } }, access_token: { type: string }, refresh_token: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/login/customer',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) => login({ ...req, body: { ...req.body, role: authConstants.AUTH_SETTINGS.DEFAULT_ROLE } }, res, next)
);

/**
 * @swagger
 * /auth/login/driver:
 *   post:
 *     summary: Login as driver
 *     tags: [Authentication]
 *     description: Authenticates a driver user and returns JWT tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               device_id: { type: string, nullable: true }
 *               device_type: { type: string, enum: ['desktop', 'mobile', 'tablet', 'unknown'], nullable: true }
 *               platform: { type: string, enum: ['web', 'ios', 'android'], nullable: true }
 *               mfa_code: { type: string, minLength: 6, maxLength: 6, nullable: true }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully logged in' }
 *                 data: { type: object, properties: { user: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string }, profile: { type: object, nullable: true } }, access_token: { type: string }, refresh_token: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/login/driver',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) => login({ ...req, body: { ...req.body, role: 'driver' } }, res, next)
);

/**
 * @swagger
 * /auth/login/merchant:
 *   post:
 *     summary: Login as merchant
 *     tags: [Authentication]
 *     description: Authenticates a merchant user and returns JWT tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               device_id: { type: string, nullable: true }
 *               device_type: { type: string, enum: ['desktop', 'mobile', 'tablet', 'unknown'], nullable: true }
 *               platform: { type: string, enum: ['web', 'ios', 'android'], nullable: true }
 *               mfa_code: { type: string, minLength: 6, maxLength: 6, nullable: true }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully logged in' }
 *                 data: { type: object, properties: { user: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string }, profile: { type: object, nullable: true } }, access_token: { type: string }, refresh_token: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/login/merchant',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) => login({ ...req, body: { ...req.body, role: 'merchant' } }, res, next)
);

/**
 * @swagger
 * /auth/login/staff:
 *   post:
 *     summary: Login as staff
 *     tags: [Authentication]
 *     description: Authenticates a staff user and returns JWT tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               device_id: { type: string, nullable: true }
 *               device_type: { type: string, enum: ['desktop', 'mobile', 'tablet', 'unknown'], nullable: true }
 *               platform: { type: string, enum: ['web', 'ios', 'android'], nullable: true }
 *               mfa_code: { type: string, minLength: 6, maxLength: 6, nullable: true }
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'User successfully logged in' }
 *                 data: { type: object, properties: { user: { type: object, properties: { id: { type: integer }, first_name: { type: string }, last_name: { type: string }, email: { type: string }, role: { type: string }, profile: { type: object, nullable: true } }, access_token: { type: string }, refresh_token: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/login/staff',
  rateLimiters.auth,
  loginValidations,
  validate,
  (req, res, next) => login({ ...req, body: { ...req.body, role: 'staff' } }, res, next)
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     description: Terminates a user session or all sessions for a user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               device_id: { type: string, nullable: true }
 *               clear_all_devices: { type: boolean, nullable: true }
 *     responses:
 *       200:
 *         description: Session terminated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'Session successfully terminated' }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', rateLimiters.general, authenticate, logoutValidations, validate, logout);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     description: Refreshes an access token using a refresh token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token: { type: string }
 *     responses:
 *       200:
 *         description: Token refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'Token successfully refreshed' }
 *                 data: { type: object, properties: { access_token: { type: string }, refresh_token: { type: string } } }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/refresh', rateLimiters.general, refreshTokenValidations, validate, refresh);

/**
 * @swagger
 * /auth/verify-mfa:
 *   post:
 *     summary: Verify MFA code
 *     tags: [Authentication]
 *     description: Verifies a multi-factor authentication code for a user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id, mfa_code, mfa_method]
 *             properties:
 *               user_id: { type: integer }
 *               mfa_code: { type: string, minLength: 6, maxLength: 6 }
 *               mfa_method: { type: string, enum: ['email', 'sms', 'authenticator'] }
 *     responses:
 *       200:
 *         description: MFA verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: 'success' }
 *                 message: { type: string, example: 'Multi-factor authentication enabled' }
 *                 data: { type: object }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/verify-mfa', rateLimiters.auth, verifyMfaValidations, validate, verifyMfa);

module.exports = router;