// accessControlRoutes.js
// API routes for staff security operations.

'use strict';

const express = require('express');
const router = express.Router();
const accessControlController = require('@controllers/staff/security/accessControlController');
const accessControlMiddleware = require('@middleware/staff/security/accessControlMiddleware');

/**
 * @swagger
 * /staff/security/enforce-permissions:
 *   post:
 *     summary: Enforce permissions for staff
 *     tags: [Staff Security]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - requiredPermission
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *               requiredPermission:
 *                 type: string
 *                 description: Required permission
 *     responses:
 *       200:
 *         description: Access granted
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
 *                   properties:
 *                     accessGranted:
 *                       type: boolean
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/enforce-permissions', accessControlMiddleware.validateEnforcePermissions, accessControlController.enforcePermissions);

/**
 * @swagger
 * /staff/security/audit-access:
 *   post:
 *     summary: Audit staff access attempt
 *     tags: [Staff Security]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Access audited successfully
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
 *                   properties:
 *                     id:
 *                       type: integer
 *                     staffId:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/audit-access', accessControlMiddleware.validateAuditAccess, accessControlController.auditAccess);

/**
 * @swagger
 * /staff/security/update-access-rules:
 *   post:
 *     summary: Update access rules for staff
 *     tags: [Staff Security]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - permissions
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Permissions to assign
 *     responses:
 *       200:
 *         description: Access rules updated successfully
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
 *                   properties:
 *                     staffId:
 *                       type: integer
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/update-access-rules', accessControlMiddleware.validateUpdateAccessRules, accessControlController.updateAccessRules);

module.exports = router;