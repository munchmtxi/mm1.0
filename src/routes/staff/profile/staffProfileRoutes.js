// staffProfileRoutes.js
// API routes for staff profile operations.

'use strict';

const express = require('express');
const router = express.Router();
const staffProfileController = require('@controllers/staff/profile/staffProfileController');
const staffProfileMiddleware = require('@middleware/staff/profile/staffProfileMiddleware');

/**
 * @swagger
 * /staff/profile/create:
 *   post:
 *     summary: Create staff profile
 *     tags: [Staff Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - details
 *             properties:
 *               userId:
 *                 type: integer
 *                 description: User ID
 *               details:
 *                 type: object
 *                 required:
 *                   - merchantId
 *                   - position
 *                 properties:
 *                   merchantId:
 *                     type: integer
 *                   position:
 *                     type: string
 *                   branchId:
 *                     type: integer
 *                   certifications:
 *                     type: array
 *                     items:
 *                       type: string
 *                   geofenceId:
 *                     type: integer
 *                   bankDetails:
 *                     type: object
 *                     properties:
 *                       accountNumber:
 *                         type: string
 *                       routingNumber:
 *                         type: string
 *                       bankName:
 *                         type: string
 *                       method:
 *                         type: string
 *     responses:
 *       200:
 *         description: Staff profile created successfully
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
 *                     user_id:
 *                       type: integer
 *                     position:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/create', staffProfileMiddleware.validateCreateStaffProfile, staffProfileController.createStaffProfile);

/**
 * @swagger
 * /staff/profile/update:
 *   post:
 *     summary: Update staff profile
 *     tags: [Staff Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - details
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *               details:
 *                 type: object
 *                 properties:
 *                   userUpdates:
 *                     type: object
 *                     properties:
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       preferred_language:
 *                         type: string
 *                       country:
 *                         type: string
 *                   staffUpdates:
 *                     type: object
 *                     properties:
 *                       position:
 *                         type: string
 *                       branch_id:
 *                         type: integer
 *                       geofence_id:
 *                         type: integer
 *                       certifications:
 *                         type: array
 *                         items:
 *                           type: string
 *                       assigned_area:
 *                         type: string
 *                       availability_status:
 *                         type: string
 *                   bankDetails:
 *                     type: object
 *                     properties:
 *                       accountNumber:
 *                         type: string
 *                       routingNumber:
 *                         type: string
 *                       bankName:
 *                         type: string
 *                       method:
 *                         type: string
 *     responses:
 *       200:
 *         description: Staff profile updated successfully
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
 *                     user:
 *                       type: object
 *                     staff:
 *                       type: object
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/update', staffProfileMiddleware.validateUpdateStaffDetails, staffProfileController.updateStaffDetails);

/**
 * @swagger
 * /staff/profile/verify-compliance:
 *   post:
 *     summary: Verify staff compliance
 *     tags: [Staff Profile]
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
 *         description: Compliance verified successfully
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
 *                     isCompliant:
 *                       type: boolean
 *                     missingFields:
 *                       type: array
 *                       items:
 *                         type: string
 *                     missingCertifications:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/verify-compliance', staffProfileMiddleware.validateVerifyCompliance, staffProfileController.verifyCompliance);

/**
 * @swagger
 * /staff/profile/get:
 *   post:
 *     summary: Get staff profile
 *     tags: [Staff Profile]
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
 *         description: Staff profile retrieved successfully
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
 *                     user_id:
 *                       type: integer
 *                     position:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/get', staffProfileMiddleware.validateGetStaffProfile, staffProfileController.getStaffProfile);

module.exports = router;