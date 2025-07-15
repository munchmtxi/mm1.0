'use strict';

const express = require('express');
const router = express.Router();
const {
  encryptSensitiveDataAuth,
  complyWithRegulationsAuth,
  restrictDataAccessAuth,
  auditDataSecurityAuth,
} = require('@middleware/merchant/security/dataProtectionMiddleware');
const {
  validateEncryptSensitiveData,
  validateComplyWithRegulations,
  validateRestrictDataAccess,
  validateAuditDataSecurity,
} = require('@validators/merchant/security/dataProtectionValidator');
const {
  encryptSensitiveDataController,
  complyWithRegulationsController,
  restrictDataAccessController,
  auditDataSecurityController,
} = require('@controllers/merchant/security/dataProtectionController');

/**
 * @swagger
 * /merchant/security/{merchantId}/encrypt:
 *   post:
 *     summary: Encrypt sensitive data
 *     description: Encrypts sensitive merchant data.
 *     tags: [DataProtection]
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
 *               type:
 *                 type: string
 *                 example: personal
 *               content:
 *                 type: object
 *                 example: { name: "John Doe" }
 *     responses:
 *       200:
 *         description: Data encrypted
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
 *                   example: Data encrypted successfully
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
router.post(
  '/:merchantId/encrypt',
  encryptSensitiveDataAuth,
  validateEncryptSensitiveData,
  encryptSensitiveDataController
);

/**
 * @swagger
 * /merchant/security/{merchantId}/compliance:
 *   post:
 *     summary: Verify regulatory compliance
 *     description: Verifies merchant compliance with data protection standards.
 *     tags: [DataProtection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Compliance verified
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
 *                   example: Compliance verified
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid standards
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant not found
 */
router.post(
  '/:merchantId/compliance',
  complyWithRegulationsAuth,
  validateComplyWithRegulations,
  complyWithRegulationsController
);

/**
 * @swagger
 * /merchant/security/{merchantId}/restrict:
 *   post:
 *     summary: Restrict data access
 *     description: Restricts data access for a specific user and permission.
 *     tags: [DataProtection]
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
 *               userId:
 *                 type: integer
 *                 example: 456
 *               permission:
 *                 type: string
 *                 example: read
 *     responses:
 *       200:
 *         description: Access restricted
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
 *                   example: Access restricted
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid permission
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant or user not found
 */
router.post(
  '/:merchantId/restrict',
  restrictDataAccessAuth,
  validateRestrictDataAccess,
  restrictDataAccessController
);

/**
 * @swagger
 * /merchant/security/{merchantId}/audit:
 *   get:
 *     summary: Audit data security
 *     description: Retrieves security audit logs for the merchant.
 *     tags: [DataProtection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Audit completed
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
 *                   example: Security audit completed
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Merchant not found
 */
router.get(
  '/:merchantId/audit',
  auditDataSecurityAuth,
  validateAuditDataSecurity,
  auditDataSecurityController
);

module.exports = router;