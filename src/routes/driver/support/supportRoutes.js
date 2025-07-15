'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('@controllers/driver/support/supportController');
const supportValidator = require('@validators/driver/support/supportValidator');
const supportMiddleware = require('@middleware/driver/support/supportMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Support
 *   description: Driver support request and ticket management operations
 */

/**
 * @swagger
 * /driver/support/ticket:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Driver Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_type
 *               - issue_type
 *               - description
 *             properties:
 *               service_type:
 *                 type: string
 *                 enum: ['mtxi', 'munch']
 *               issue_type:
 *                 type: string
 *                 enum: ['PAYMENT_ISSUE', 'CUSTOMER_ISSUE', 'TECHNICAL_ISSUE', 'OTHER']
 *               description:
 *                 type: string
 *                 minLength: 10
 *               ride_id:
 *                 type: integer
 *               delivery_order_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Support ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid service type, issue type, or description
 *       404:
 *         description: Driver not found
 */
router.post(
  '/ticket',
  validate(supportValidator.createSupportTicket),
  supportMiddleware.checkDriverExists,
  supportController.createSupportTicket
);

/**
 * @swagger
 * /driver/support/ticket/{ticketId}:
 *   get:
 *     summary: Track support ticket status
 *     tags: [Driver Support]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Driver or ticket not found
 */
router.get(
  '/ticket/:ticketId',
  validate(supportValidator.trackTicketStatus),
  supportMiddleware.checkDriverExists,
  supportController.trackTicketStatus
);

/**
 * @swagger
 * /driver/support/cancellation-policies:
 *   get:
 *     summary: Get cancellation policies
 *     tags: [Driver Support]
 *     responses:
 *       200:
 *         description: Cancellation policies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Driver not found
 */
router.get(
  '/cancellation-policies',
  validate(supportValidator.getCancellationPolicies),
  supportMiddleware.checkDriverExists,
  supportController.getCancellationPolicies
);

/**
 * @swagger
 * /driver/support/ticket/{ticketId}/escalate:
 *   post:
 *     summary: Escalate a support ticket
 *     tags: [Driver Support]
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ticket escalated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Ticket already escalated or resolved
 *       404:
 *         description: Driver or ticket not found
 */
router.post(
  '/ticket/:ticketId/escalate',
  validate(supportValidator.escalateTicket),
  supportMiddleware.checkDriverExists,
  supportController.escalateTicket
);

module.exports = router;