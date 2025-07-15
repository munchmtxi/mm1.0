'use strict';

const express = require('express');
const router = express.Router();
const settingsController = require('@controllers/driver/profile/settingsController');
const settingsValidator = require('@validators/driver/profile/settingsValidator');
const settingsMiddleware = require('@middleware/driver/profile/settingsMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Settings
 *   description: Driver profile settings management operations
 */

/**
 * @swagger
 * /driver/settings/country:
 *   put:
 *     summary: Set driver country
 *     tags: [Driver Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - country
 *             properties:
 *               country:
 *                 type: string
 *                 example: US
 *     responses:
 *       200:
 *         description: Country updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid country
 *       404:
 *         description: Driver not found
 */
router.put(
  '/country',
  validate(settingsValidator.setCountry),
  settingsMiddleware.checkDriverExists,
  settingsController.setCountry
);

/**
 * @swagger
 * /driver/settings/language:
 *   put:
 *     summary: Set driver language
 *     tags: [Driver Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - language
 *             properties:
 *               language:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Language updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid language
 *       404:
 *         description: Driver not found
 */
router.put(
  '/language',
  validate(settingsValidator.setLanguage),
  settingsMiddleware.checkDriverExists,
  settingsController.setLanguage
);

/**
 * @swagger
 * /driver/settings/accessibility:
 *   put:
 *     summary: Configure accessibility settings
 *     tags: [Driver Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - screenReaderEnabled
 *               - fontSize
 *             properties:
 *               screenReaderEnabled:
 *                 type: boolean
 *               fontSize:
 *                 type: number
 *                 minimum: 12
 *                 maximum: 24
 *     responses:
 *       200:
 *         description: Accessibility settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid accessibility settings
 *       404:
 *         description: Driver not found
 */
router.put(
  '/accessibility',
  validate(settingsValidator.configureAccessibility),
  settingsMiddleware.checkDriverExists,
  settingsController.configureAccessibility
);

/**
 * @swagger
 * /driver/settings/privacy:
 *   put:
 *     summary: Update privacy settings
 *     tags: [Driver Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location_visibility:
 *                 type: string
 *                 enum: ['app_only', 'anonymized', 'public']
 *               data_sharing:
 *                 type: string
 *                 enum: ['none', 'analytics', 'partners']
 *               notifications:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   sms:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   whatsapp:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid privacy settings
 *       404:
 *         description: Driver not found
 */
router.put(
  '/privacy',
  validate(settingsValidator.updatePrivacySettings),
  settingsMiddleware.checkDriverExists,
  settingsController.updatePrivacySettings
);

module.exports = router;