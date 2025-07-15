'use strict';

const express = require('express');
const router = express.Router();
const dataProtectionController = require('@controllers/merchant/compliance/dataProtectionController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const dataProtectionValidator = require('@validators/merchant/compliance/dataProtectionValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_compliance'));

/**
 * @swagger
 * /merchant/compliance/{merchantId}/encrypt:
 *   post:
 *     summary: Encrypt sensitive data
 *     tags: [Data Protection Compliance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum: [customer, staff, driver]
 *                   sensitiveData:
 *                     type: object
 *     responses:
 *       200:
 *         description: Data encrypted successfully
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
 *                     userId:
 *                       type: string
 *                     role:
 *                       type: string
 *                     encrypted:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant or entity not found
 */
router.post('/:merchantId/encrypt', dataProtectionValidator.validateEncryptData, dataProtectionController.encryptData);

/**
 * @swagger
 * /merchant/compliance/{merchantId}/gdpr:
 *   get:
 *     summary: Enforce GDPR/CCPA compliance
 *     tags: [Data Protection Compliance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: GDPR compliance checked successfully
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
 *                     isCompliant:
 *                       type: boolean
 *                     complianceChecks:
 *                       type: object
 *                       properties:
 *                         hasDataProtectionPolicy:
 *                           type: boolean
 *                         dataEncrypted:
 *                           type: boolean
 *                         consentObtained:
 *                           type: boolean
 *                         dataRetentionCompliant:
 *                           type: boolean
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid merchant ID
 *       404:
 *         description: Merchant not found
 */
router.get('/:merchantId/gdpr', dataProtectionValidator.validateEnforceGDPR, dataProtectionController.enforceGDPR);

/**
 * @swagger
 * /merchant/compliance/{merchantId}/access:
 *   post:
 *     summary: Manage data access permissions
 *     tags: [Data Protection Compliance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessData:
 *                 type: object
 *                 properties:
 *                   userId:
 *                     type: string
 *                   role:
 *                     type: string
 *                     enum: [customer, staff, driver]
 *                   resource:
 *                     type: string
 *                   permissions:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Data access managed successfully
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
 *                     accessRecord:
 *                       type: object
 *                       properties:
 *                         user_id:
 *                           type:
 *                         role:
 *                           type: string
 *                         merchant_id:
 *                           type: string
 *                         resource:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:merchantId}/access', dataProtectionValidator.validateManageDataAccess, dataProtectionController.manageDataAccess);

module.exports = router;