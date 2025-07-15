// roleManagementRoutes.js
// API routes for staff role management operations.

'use strict';

const express = require('express');
const router = express.Router();
const roleManagementController = require('@controllers/staff/staffManagement/roleManagementController');
const roleManagementMiddleware = require('@middleware/staff/staffManagement/roleManagementMiddleware');

/**
 * @swagger
 * /staff/staffManagement/assign-role:
 *   post:
 *     summary: Assign role to staff
 *     tags: [Staff Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - role
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *               role:
 *                 type: string
 *                 description: Role to assign (e.g., front_of_house)
 *     responses:
 *       200:
 *         description: Role assigned successfully
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
 *                     staff_id:
 *                       type: integer
 *                     role_id:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/assign-role', roleManagementMiddleware.validateAssignRole, roleManagementController.assignRole);

/**
 * @swagger
 * /staff/staffManagement/update-permissions:
 *   post:
 *     summary: Update role permissions for staff
 *     tags: [Staff Management]
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
 *                 description: Permissions to update
 *     responses:
 *       200:
 *         description: Permissions updated successfully
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
router.post('/update-permissions', roleManagementMiddleware.validateUpdateRolePermissions, roleManagementController.updateRolePermissions);

/**
 * @swagger
 * /staff/staffManagement/get-role-details:
 *   post:
 *     summary: Get role details for staff
 *     tags: [Staff Management]
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
 *         description: Role details retrieved successfully
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
 *                     position:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/get-role-details', roleManagementMiddleware.validateGetRoleDetails, roleManagementController.getRoleDetails);

module.exports = router;