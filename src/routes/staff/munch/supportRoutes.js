// supportRoutes.js
// API routes for staff munch support operations.

'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('@controllers/staff/munch/supportController');
const supportMiddleware = require('@middleware/staff/munch/supportMiddleware');

/**
 * @swagger
 * /staff/munch/handle-inquiry:
 *   post:
 *     summary: Handle order inquiry
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - issue
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               issue:
 *                 type: object
 *                 required:
 *                   - description
 *                   - issue_type
 *                 properties:
 *                   description:
 *                     type: string
 *                     description: Issue description
 *                   issue_type:
 *                     type: string
 *                     enum: [delivery_issue, order_issue, payment_issue, other]
 *                     description: Type of issue
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Inquiry handled successfully
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
router.post('/handle-inquiry', supportMiddleware.validateHandleOrderInquiry, supportController.handleOrderInquiry);

/**
 * @swagger
 * /staff/munch/resolve-issue:
 *   post:
 *     summary: Resolve order issue
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - resolution
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               resolution:
 *                 type: string
 *                 description: Resolution details
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Issue resolved successfully
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
router.post('/resolve-issue', supportMiddleware.validateResolveOrderIssue, supportController.resolveOrderIssue);

/**
 * @swagger
 * /staff/munch/escalate-dispute:
 *   post:
 *     summary: Escalate order dispute
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Dispute escalated successfully
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
 *                     customer_id:
 *                       type: integer
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/escalate-dispute', supportMiddleware.validateEscalateOrderDispute, supportController.escalateOrderDispute);

module.exports = router;