'use strict';

/**
 * Customer accessibility routes.
 */

const express = require('express');
const router = express.Router();
const accessibilityController = require('@controllers/customer/profile/accessibilityController');
const accessibilityValidator = require('@validators/customer/profile/accessibilityValidator');
const accessibilityMiddleware = require('@middleware/customer/profile/accessibilityMiddleware');

/**
 * @swagger
 * /api/v1/customer/profile/accessibility/screen-readers:
 *   post:
 *     summary: Enable or disable screen readers
 *     tags: [Customer Accessibility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Screen reader settings updated successfully
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
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/screen-readers', accessibilityMiddleware.validateUserId, accessibilityMiddleware.validateLanguageCode, accessibilityValidator.validateEnableScreenReaders, accessibilityController.enableScreenReaders);

/**
 * @swagger
 * /api/v1/customer/profile/accessibility/font-size:
 *   post:
 *     summary: Adjust font size
 *     tags: [Customer Accessibility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fontSize:
 *                 type: string
 *                 enum: [small, medium, large]
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Font size settings updated successfully
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
 *         description: Invalid font size
 *       500:
 *         description: Server error
 */
router.post('/font-size', accessibilityMiddleware.validateUserId, accessibilityMiddleware.validateLanguageCode, accessibilityValidator.validateAdjustFonts, accessibilityController.adjustFonts);

/**
 * @swagger
 * /api/v1/customer/profile/accessibility/language:
 *   post:
 *     summary: Set accessibility language
 *     tags: [Customer Accessibility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Accessibility language updated successfully
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
 *         description: Invalid language
 *       500:
 *         description: Server error
 */
router.post('/language', accessibilityMiddleware.validateUserId, accessibilityMiddleware.validateLanguageCode, accessibilityValidator.validateSupportMultiLanguage, accessibilityController.supportMultiLanguage);

module.exports = router;