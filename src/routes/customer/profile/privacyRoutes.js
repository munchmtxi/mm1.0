'use strict';

/**
 * Customer privacy routes.
 */

const express = require('express');
const router = express.Router();
const privacyController = require('@controllers/customer/profile/privacyController');
const privacyValidator = require('@validators/customer/profile/privacyValidator');
const privacyMiddleware = require('@middleware/customer/profile/privacyMiddleware');

/**
 * @swagger
 * /api/v1/customer/profile/privacy/settings:
 *   post:
 *     summary: Set privacy settings
 *     tags: [Customer Privacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location_visibility:
 *                 type: string
 *                 enum: [public, private, contacts]
 *               data_sharing:
 *                 type: boolean
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
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
 *         description: Invalid privacy settings
 *       500:
 *         description: Server error
 */
router.post('/settings', privacyMiddleware.validateUserId, privacyMiddleware.validateLanguageCode, privacyValidator.validateSetPrivacySettings, privacyController.setPrivacySettings);

/**
 * @swagger
 * /api/v1/customer/profile/privacy/data-access:
 *   post:
 *     summary: Manage data access permissions
 *     tags: [Customer Privacy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: object
 *               languageCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Data access settings updated successfully
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
 *         description: Invalid permissions
 *       500:
 *         description: Server error
 */
router.post('/data-access', privacyMiddleware.validateUserId, privacyMiddleware.validateLanguageCode, privacyValidator.validateManageDataAccess, privacyController.manageDataAccess);

module.exports = router;