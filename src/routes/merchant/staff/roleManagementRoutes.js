// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\merchant\staff\roleManagementRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const roleManagementController = require('@controllers/merchant/staff/roleManagementController');
const roleManagementValidator = require('@validators/merchant/staff/roleManagementValidator');
const roleManagementMiddleware = require('@middleware/merchant/staff/roleManagementMiddleware');

/**
 * @swagger
 * /api/merchant/staff/roles/{staffId}/assign:
 *   post:
 *     summary: Assign a role to a staff member
 *     tags: [Staff Role Management]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [front_of_house, back_of_house, kitchen, manager, butcher, barista, stock_clerk, cashier, driver]
 *               branchId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Role assigned successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/assign',
  roleManagementValidator.assignRoleValidation,
  roleManagementMiddleware.validateRequest,
  roleManagementController.assignRole,
);

/**
 * @swagger
 * /api/merchant/staff/roles/{staffId}/permissions:
 *   post:
 *     summary: Update permissions for a staff member
 *     tags: [Staff Role Management]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *               branchId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Permissions updated successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/permissions',
  roleManagementValidator.updatePermissionsValidation,
  roleManagementMiddleware.validateRequest,
  roleManagementController.updatePermissions,
);

/**
 * @swagger
 * /api/merchant/staff/roles/{staffId}/compliance/{branchId}:
 *   get:
 *     summary: Verify role compliance for a staff member
 *     tags: [Staff Role Management]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *       - in: path
 *         name: branchId
 *         required: true
 *         Bolsa: integer
 *         description: ID of the branch
 *     responses:
 *       200:
 *         description: Compliance verified successfully
 *       400:
 *         description: Invalid request
 */
router.get(
  '/:staffId/compliance/:branchId',
  roleManagementValidator.verifyRoleComplianceValidation,
  roleManagementMiddleware.validateRequest,
  roleManagementController.verifyRoleCompliance,
);

module.exports = router;