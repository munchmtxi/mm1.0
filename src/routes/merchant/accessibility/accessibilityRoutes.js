'use strict';

const express = require('express');
const router = express.Router();
const accessibilityController = require('@controllers/merchant/accessibilityController');
const accessibilityValidator = require('@validators/merchant/accessibility/accessibilityValidator');
const accessibilityMiddleware = require('@middleware/merchant/accessibility/accessibilityMiddleware');
const { validate } = require('@middleware/validate');

/**
 * Accessibility routes for merchant-related operations.
 */
router.post(
  '/:merchantId/screen-readers',
  accessibilityMiddleware.verifyMerchant,
  accessibilityMiddleware.restrictToMerchant,
  validate(accessibilityValidator.enableScreenReaders),
  /**
   * @swagger
   * /api/merchants/{merchantId}/screen-readers:
   *   post:
   *     summary: Enable screen readers for a merchant
   *     tags: [Accessibility]
   *     parameters:
   *       - in: path
   *         name: merchantId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Merchant ID
   *     responses:
   *       200:
   *         description: Screen readers enabled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     merchantId:
   *                       type: string
   *                     screenReaderEnabled:
   *                       type: boolean
   *                     language:
   *                       type: string
   *                     action:
   *                       type: string
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid input or screen reader already enabled
   *       403:
   *         description: Merchant access required
   *       404:
   *         description: Merchant not found
   */
  accessibilityController.enableScreenReaders
);

router.patch(
  '/:merchantId/fonts',
  accessibilityMiddleware.verifyMerchant,
  accessibilityMiddleware.restrictToMerchant,
  validate(accessibilityValidator.adjustFonts),
  /**
   * @swagger
   * /api/merchants/{merchantId}/fonts:
   *   patch:
   *     summary: Adjust font size for a merchant
   *     tags: [Accessibility]
   *     parameters:
   *       - in: path
   *         name: merchantId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Merchant ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fontSize:
   *                 type: number
   *                 minimum: 12
   *                 maximum: 24
   *     responses:
   *       200:
   *         description: Font size adjusted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     merchantId:
   *                       type: string
   *                     fontSize:
   *                       type: number
   *                     previousFontSize:
   *                       type: number
   *                     language:
   *                       type: string
   *                     action:
   *                       type: string
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid font size
   *       403:
   *         description: Merchant access required
   *       404:
   *         description: Merchant not found
   */
  accessibilityController.adjustFonts
);

router.patch(
  '/:merchantId/language',
  accessibilityMiddleware.verifyMerchant,
  accessibilityMiddleware.restrictToMerchant,
  validate(accessibilityValidator.supportMultiLanguage),
  /**
   * @swagger
   * /api/merchants/{merchantId}/language:
   *   patch:
   *     summary: Update language for a merchant
   *     tags: [Accessibility]
   *     parameters:
   *       - in: path
   *         name: merchantId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Merchant ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               language:
   *                 type: string
   *                 enum: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti']
   *     responses:
   *       200:
   *         description: Language updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     merchantId:
   *                       type: string
   *                     language:
   *                       type: string
   *                     previousLanguage:
   *                       type: string
   *                     action:
   *                       type: string
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid language or language already set
   *       403:
   *         description: Merchant access required
   *       404:
   *         description: Merchant not found
   */
  accessibilityController.supportMultiLanguage
);

module.exports = router;