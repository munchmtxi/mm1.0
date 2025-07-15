'use strict';

const express = require('express');
const router = express.Router();
const regulatoryController = require('@controllers/merchant/compliance/regulatoryController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const regulatoryValidator = require('@validators/merchant/compliance/regulatoryValidator');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_compliance'));

/**
 * @swagger
 * /merchant/compliance/{merchantId}/certifications:
 *   post:
 *     summary: Manage merchant certifications
 *     tags: [Regulatory Compliance]
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
 *               certData:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                   issueDate:
 *                     type: string
 *                     format: date
 *                   expiryDate:
 *                     type: string
 *                     format: date
 *     responses:
 *       200:
 *         description: Certification managed successfully
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
 *                     certType:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:merchantId/certifications', regulatoryValidator.validateManageCertifications, regulatoryController.manageCertifications);

/**
 * @swagger
 * /merchant/compliance/staff/{staffId}/compliance:
 *   get:
 *     summary: Verify staff compliance
 *     tags: [Regulatory Compliance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff compliance verified successfully
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
 *                     staffId:
 *                       type: string
 *                     isCompliant:
 *                       type: boolean
 *                     complianceChecks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           isValid:
 *                             type: boolean
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid staff ID
 *       404:
 *         description: Staff not found
 */
router.get('/staff/:staffId/compliance', regulatoryValidator.validateVerifyStaffCompliance, regulatoryController.verifyStaffCompliance);

/**
 * @swagger
 * /merchant/compliance/driver/{driverId}/compliance:
 *   get:
 *     summary: Verify driver compliance
 *     tags: [Regulatory Compliance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     responses:
 *       200:
 *         description: Driver compliance verified successfully
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
 *                     driverId:
 *                       type: string
 *                     isCompliant:
 *                       type: boolean
 *                     complianceChecks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           isValid:
 *                             type: boolean
 *                     points:
 *                       type: integer
 *               400:
                 description: Invalid driver ID
               404:
                 description: Driver not found
 */
router.get('/driver/:driverId/compliance', regulatoryValidator.validateVerifyDriverCompliance, regulatoryController.verifyDriverCompliance);

/**
 * @swagger
 * /merchant/compliance/{merchantId}/audit:
 *   get:
 *     summary: Audit merchant compliance
 *     tags: [Regulatory Compliance]
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
 *         description: Compliance audited successfully
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
 *                         hasCertifications:
 *                           type: boolean
 *                         validCertificates:
 *                           type: boolean
 *                         meetsRegulatoryRequirements:
 *                           type: boolean
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid merchant ID
 *       404:
 *         description: Merchant not found
 */
router.get('/:merchantId/audit', regulatoryValidator.validateAuditCompliance, regulatoryController.auditCompliance);

module.exports = router;