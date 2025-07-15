'use strict';

const express = require('express');
const router = express.Router();
const {
  updateBusinessDetailsAuth,
  setCountrySettingsAuth,
  manageLocalizationAuth,
} = require('@middleware/merchant/profile/merchantProfileMiddleware');
const {
  validateUpdateBusinessDetails,
  validateSetCountrySettings,
  validateManageLocalization,
} = require('@validators/merchant/profile/merchantProfileValidator');
const {
  updateBusinessDetailsController,
  setCountrySettingsController,
  manageLocalizationController,
} = require('@controllers/merchant/profile/merchantProfileController');

/**
 * @swagger
 * /merchant/profile/{merchantId}/business:
 *   patch:
 *     summary: Update business details
 *     description: Updates merchant business details (e.g., name, phone, hours).
 *     tags: [MerchantProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               businessName:
 *                 type: string
 *                 example: John's Cafe
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               businessHours:
 *                 type: object
 *                 properties:
 *                   open:
 *                     type: string
 *                     example: 09:00
 *                   close:
 *                     type: string
 *                     example: 22:00
 *               businessType:
 *                 type: string
 *                 example: restaurant
 *               businessTypeDetails:
 *                 type: object
 *                 example: { cuisine: 'Italian' }
 *     responses:
 *       200:
 *         description: Business details updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Business details updated for merchant 123.
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant not found
 */
router.patch(
  '/:merchantId/business',
  updateBusinessDetailsAuth,
  validateUpdateBusinessDetails,
  updateBusinessDetailsController
);

/**
 * @swagger
 * /merchant/profile/{merchantId}/country:
 *   patch:
 *     summary: Set country settings
 *     description: Configures merchant country settings for currency.
 *     tags: [MerchantProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               country:
 *                 type: string
 *                 example: US
 *     responses:
 *       200:
 *         description: Country settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Country settings updated to US for merchant 123.
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant not found
 */
router.patch(
  '/:merchantId/country',
  setCountrySettingsAuth,
  validateSetCountrySettings,
  setCountrySettingsController
);

/**
 * @swagger
 * /merchant/profile/{merchantId}/localization:
 *   patch:
 *     summary: Manage localization settings
 *     description: Updates merchant localization settings (e.g., language).
 *     tags: [MerchantProfile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
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
 *                 example: en
 *     responses:
 *       200:
 *         description: Localization settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Localization settings updated to en for merchant 123.
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant not found
 */
router.patch(
  '/:merchantId/localization',
  manageLocalizationAuth,
  validateManageLocalization,
  manageLocalizationController
);

module.exports = router;