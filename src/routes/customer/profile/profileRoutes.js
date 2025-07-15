'use strict';

/**
 * Customer profile routes.
 */

const express = require('express');
const router = express.Router();
const profileController = require('@controllers/customer/profile/profileController');
const profileValidator = require('@validators/customer/profile/profileValidator');
const profileMiddleware = require('@middleware/customer/profile/profileMiddleware');

/**
 * @swagger
 * /api/v1/customer/profile/update:
 *   post:
 *     summary: Update customer profile
 *     tags: [Customer Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone_number:
 *                 type: string
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                   city:
 *                     type: string
 *                   countryCode:
 *                     type: string
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid profile data
 *       500:
 *         description: Server error
 */
router.post('/update', profileMiddleware.validateUserId, profileMiddleware.validateLanguageCode, profileValidator.validateUpdateProfile, profileController.updateProfile);

/**
 * @swagger
 * /api/v1/customer/profile/country:
 *   post:
 *     summary: Set customer country
 *     tags: [Customer Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Country set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid country code
 *       500:
 *         description: Server error
 */
router.post('/country', profileMiddleware.validateUserId, profileMiddleware.validateLanguageCode, profileValidator.validateSetCountry, profileController.setCountry);

/**
 * @swagger
 * /api/v1/customer/profile/language:
 *   post:
 *     summary: Set customer language
 *     tags: [Customer Profile]
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
 *         description: Language set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid language code
 *       500:
 *         description: Server error
 */
router.post('/language', profileMiddleware.validateUserId, profileValidator.validateSetLanguage, profileController.setLanguage);

/**
 * @swagger
 * /api/v1/customer/profile/dietary-preferences:
 *   post:
 *     summary: Set dietary preferences
 *     tags: [Customer Profile]
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
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Dietary preferences set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid dietary preferences
 *       500:
 *         description: Server error
 */
router.post('/dietary-preferences', profileMiddleware.validateUserId, profileMiddleware.validateLanguageCode, profileValidator.validateSetDietaryPreferences, profileController.setDietaryPreferences);

/**
 * @swagger
 * /api/v1/customer/profile/default-address:
 *   post:
 *     summary: Set default address
 *     tags: [Customer Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addressId:
 *                 type: string
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Default address set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid address ID
 *       500:
 *         description: Server error
 */
router.post('/default-address', profileMiddleware.validateUserId, profileMiddleware.validateLanguageCode, profileValidator.validateSetDefaultAddress, profileController.setDefaultAddress);

/**
 * @swagger
 * /api/v1/customer/profile:
 *   get:
 *     summary: Get customer profile
 *     tags: [Customer Profile]
 *     parameters:
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       500:
 *         description: Server error
 */
router.get('/', profileMiddleware.validateUserId, profileMiddleware.validateLanguageCode, profileController.getProfile);

module.exports = router;