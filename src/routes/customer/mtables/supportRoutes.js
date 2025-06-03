'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('@controllers/customer/mtables/supportController');
const supportMiddleware = require('@middleware/customer/mtables/supportMiddleware');
const supportValidator = require('@validators/customer/mtables/supportValidator');

/**
 * @swagger
 * /api/customer/mtables/support/tickets:
 *   post:
 *     summary: Create a support ticket
 *     description: Creates a support ticket for a customer issue, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Support
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issueType
 *               - description
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *                 example: 123
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 456
 *               issueType:
 *                 type: string
 *                 description: Issue type
 *                 example: payment
 *               description:
 *                 type: string
 *                 description: Issue description
 *                 example: Payment was charged twice
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Support ticket created
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                       example: 123
 *                     ticketNumber:
 *                       type: string
 *                       example: TKT-123456-ABCDEF
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or ticket creation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/support/tickets/{ticketId}:
 *   get:
 *     summary: Track ticket status
 *     description: Retrieves the status of a support ticket.
 *     tags:
 *       - Customer Support
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
 *         description: Ticket status tracked
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
 *                   example: Ticket status tracked
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: open
 *                     issue_type:
 *                       type: string
 *                       example: payment
 *       400:
 *         description: Invalid request or tracking failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/support/tickets/{ticketId}/escalate:
 *   post:
 *     summary: Escalate a support ticket
 *     description: Escalates an unresolved support ticket, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Support
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
 *         description: Ticket escalated
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
 *                   example: Ticket escalated
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: escalated
 *       400:
 *         description: Invalid request or escalation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/support/tickets',
  supportMiddleware.authenticate,
  supportMiddleware.restrictTo('customer'),
  supportMiddleware.checkPermissions('create_support_ticket'),
  supportValidator.validateCreateSupportTicket,
  supportController.createSupportTicket
);

router.get(
  '/support/tickets/:ticketId',
  supportMiddleware.authenticate,
  supportMiddleware.restrictTo('customer'),
  supportMiddleware.checkPermissions('view_support_ticket'),
  supportValidator.validateTicketId,
  supportMiddleware.checkSupportAccess,
  supportController.trackTicketStatus
);

router.post(
  '/support/tickets/:ticketId/escalate',
  supportMiddleware.authenticate,
  supportMiddleware.restrictTo('customer'),
  supportMiddleware.checkPermissions('escalate_ticket'),
  supportValidator.validateTicketId,
  supportMiddleware.checkSupportAccess,
  supportController.escalateTicket
);

module.exports = router;