'use strict';

const express = require('express');
const router = express.Router();
const { updatePrivacySettings, updateDataAccess } = require('@controllers/customer/profile/privacy/privacyController');
const { setPrivacySettingsSchema, manageDataAccessSchema } = require('@validators/customer/profile/privacy/privacyValidator');
const { updatePrivacySettings: updatePrivacyMW, updateDataAccess: updateDataAccessMW } = require('@middleware/customer/profile/privacy/privacyMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/profile/privacy/settings:
 *   patch:
 *     summary: Update customer privacy settings
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               anonymizeLocation:
 *                 type: boolean
 *               anonymizeProfile:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Privacy settings updated
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
 *                     settings:
 *                       type: object
 *                       properties:
 *                         anonymizeLocation:
 *                           type: boolean
 *                         anonymizeProfile:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid settings
 *       404:
 *         description: Customer not found
 */
router.patch('/settings', updatePrivacyMW, validate(setPrivacySettingsSchema), updatePrivacySettings);

/**
 * @swagger
 * /api/customer/profile/privacy/data-access:
 *   patch:
 *     summary: Update customer data access permissions
 *     tags: [Privacy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shareWithMerchants:
 *                 type: boolean
 *               shareWithThirdParties:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Data access permissions updated
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
 *                     permissions:
 *                       type: object
 *                       properties:
 *                         shareWithMerchants:
 *                           type: boolean
 *                         shareWithThirdParties:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid permissions
 *       404:
 *         description: Customer not found
 */
router.patch('/data-access', updateDataAccessMW, validate(manageDataAccessSchema), updateDataAccess);

module.exports = router;