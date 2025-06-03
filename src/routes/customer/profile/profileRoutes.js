'use strict';

const express = require('express');
const router = express.Router();
const {
  updateCustomerProfile,
  setCustomerCountry,
  setCustomerLanguage,
  setCustomerDietaryPreferences,
  getCustomerProfile,
} = require('@controllers/customer/profile/profileController');
const {
  updateProfileSchema,
  setCountrySchema,
  setLanguageSchema,
  setDietaryPreferencesSchema,
  getProfileSchema,
} = require('@validators/customer/profile/profileValidator');
const {
  updateCustomerProfile: updateProfileMW,
  setCustomerCountry: setCountryMW,
  setCustomerLanguage: setLanguageMW,
  setCustomerDietaryPreferences: setDietaryMW,
  getCustomerProfile: getProfileMW,
} = require('@middleware/customer/profile/profileMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/profile:
 *   patch:
 *     summary: Update customer profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     updatedFields:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Customer not found
 */
router.patch('/', updateProfileMW, validate(updateProfileSchema), updateCustomerProfile);

/**
 * @swagger
 * /api/customer/profile/country:
 *   patch:
 *     summary: Set customer country
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               countryCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Country set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     countryCode:
 *                       type: string
 *                     currency:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid country
 *       404:
 *         description: Customer not found
 */
router.patch('/country', setCountryMW, validate(setCountrySchema), setCustomerCountry);

/**
 * @swagger
 * /api/customer/profile/language:
 *   patch:
 *     summary: Set customer language
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Language set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     languageCode:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid language
 *       404:
 *         description: Customer not found
 */
router.patch('/language', setLanguageMW, validate(setLanguageSchema), setCustomerLanguage);

/**
 * @swagger
 * /api/customer/profile/dietary:
 *   patch:
 *     summary: Set customer dietary preferences
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Dietary preferences set
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     preferences:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid dietary preferences
 *       404:
 *         description: Customer not found
 */
router.patch('/dietary', setDietaryMW, validate(setDietaryPreferencesSchema), setCustomerDietaryPreferences);

/**
 * @swagger
 * /api/customer/profile:
 *   get:
 *     summary: Get customer profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     user_id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     preferred_language:
 *                       type: string
 *                     country_code:
 *                       type: string
 *                     currency:
 *                       type: string
 *                     dietary_preferences:
 *                       type: array
 *                       items:
 *                         type: string
 *                     created_at:
 *                       type: string
 *                     updated_at:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 */
router.get('/', getProfileMW, validate(getProfileSchema), getCustomerProfile);

module.exports = router;