// supportRoutes.js
// API routes for staff mtables support operations.

'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('@controllers/staff/mtables/supportController');
const supportMiddleware = require('@middleware/staff/mtables/supportMiddleware');

/**
 * @swagger
 * /staff/mtables/support-request:
 *   post:
 *     summary: Process support inquiries
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - issue
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               issue:
 *                 type: object
 *                 properties:
 *                   description:
 *                     type: string
 *                   issue_type:
 *                     type: string
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Support request processed successfully
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
 *                     ticket_number:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/support-request', supportMiddleware.validateHandleSupportRequest, supportController.handleSupportRequest);

/**
 * @swagger
 * /staff/mtables/escalate-issue:
 *   post:
 *     summary: Escalate unresolved issues
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Issue escalated successfully
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
 *                     ticket_number:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/escalate-issue', supportMiddleware.validateEscalateIssue, supportController.escalateIssue);

/**
 * @swagger
 * /staff/mtables/log-resolution:
 *   post:
 *     summary: Record support issue resolutions
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - resolutionDetails
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               resolutionDetails:
 *                 type: string
 *                 description: Resolution details
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Support resolution logged successfully
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
 *                     ticket_number:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/log-resolution', supportMiddleware.validateLogSupportResolution, supportController.logSupportResolution);

module.exports = router;