'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('@controllers/customer/munch/supportController');
const supportValidator = require('@validators/customer/munch/supportValidator');
const supportMiddleware = require('@middleware/customer/munch/supportMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/munch/support/ticket:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: integer
 *               issueType:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Support ticket created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     ticketNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Customer or order not found
 */
/**
 * @swagger
 * /api/customer/munch/support/ticket/{ticketId}/status:
 *   get:
 *     summary: Track support ticket status
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     ticketNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                     priority:
 *                       type: string
 *                     issueType:
 *                       type: string
 *                     orderId:
 *                       type: integer
 *                     orderNumber:
 *                       type: string
 *                     resolutionDetails:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 */
/**
 * @swagger
 * /api/customer/munch/support/ticket/escalate:
 *   put:
 *     summary: Escalate a support ticket
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ticket escalated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     ticketNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Ticket not found
 */

router.post('/ticket', supportMiddleware.createSupportTicket, validate(supportValidator.createSupportTicketSchema), supportController.createSupportTicket);
router.get('/ticket/:ticketId/status', supportMiddleware.trackTicketStatus, validate(supportValidator.trackTicketStatusSchema), supportController.trackTicketStatus);
router.put('/ticket/escalate', supportMiddleware.escalateTicket, validate(supportValidator.escalateTicketSchema), supportController.escalateTicket);

module.exports = router;