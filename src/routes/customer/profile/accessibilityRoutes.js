'use strict';

const express = require('express');
const router = express.Router();
const { updateScreenReader, updateFontSize, updateLanguage } = require('@controllers/customer/profile/accessibility/accessibilityController');
const { enableScreenReaderSchema, adjustFontSizeSchema, supportMultiLanguageSchema } = require('@validators/customer/profile/accessibility/accessibilityValidator');
const { updateScreenReader: updateScreenReaderMW, updateFontSize: updateFontSizeMW, updateLanguage: updateLanguageMW } = require('@middleware/customer/profile/accessibility/accessibilityMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/profile/accessibility/screen-reader:
 *   patch:
 *     summary: Enable or disable screen reader
 *     tags: [Accessibility]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Screen reader settings updated
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
 *                     userId:
 *                       type: string
 *                     screenReaderEnabled:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid setting
 *       404:
 *         description: Customer not found
 */
router.patch('/screen-reader', updateScreenReaderMW, validate(enableScreenReaderSchema), updateScreenReader);

/**
 * @swagger
 * /api/customer/profile/accessibility/font-size:
 *   patch:
 *     summary: Adjust font size
 *     tags: [Accessibility]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fontSize:
 *                 type: number
 *     responses:
 *       200:
 *         description: Font size updated
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
 *                     userId:
 *                       type: string
 *                     fontSize:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid font size
 *       404:
 *         description: Customer not found
 */
router.patch('/font-size', updateFontSizeMW, validate(adjustFontSizeSchema), updateFontSize);

/**
 * @swagger
 * /api/customer/profile/accessibility/language:
 *   patch:
 *     summary: Set UI language
 *     tags: [Accessibility]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: Language updated
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
 *                     userId:
 *                       type: string
 *                     language:
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
router.patch('/language', updateLanguageMW, validate(supportMultiLanguageSchema), updateLanguage);

module.exports = router;