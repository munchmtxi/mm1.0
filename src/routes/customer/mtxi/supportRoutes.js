'use strict';

const express = require('express');
const router = express.Router();
const supportController = require('@controllers/customer/mtxi/supportController');
const supportValidation = require('@middleware/customer/mtxi/supportValidation');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Support
 *   description: Customer support management for mtxi, munch, and mtables services
 */
router.use(authenticate, restrictTo('customer'));

/**
 * @swagger
 * /api/customer/mtxi/support:
 *   post:
 *     summary: Create a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceType
 *               - issueType
 *               - description
 *             properties:
 *               serviceType:
 *                 type: string
 *                 enum: [ride, order, booking, event_service, in_dining_order]
 *               issueType:
 *                 type: string
 *                 enum: [PAYMENT_ISSUE, SERVICE_QUALITY, CANCELLATION, DELIVERY_ISSUE, BOOKING_ISSUE, OTHER]
 *               description:
 *                 type: string
 *               rideId:
 *                 type: integer
 *               orderId:
 *                 type: integer
 *               bookingId:
 *                 type: integer
 *               groupCustomerIds:
 *                 type: array
 *                 items:
 *                   type: integer
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', checkPermissions('create_support_ticket'), supportValidation.validateCreateSupportTicket, supportController.createSupportTicket);

/**
 * @swagger
 * /api/customer/mtxi/support/{ticketId}:
 *   get:
 *     summary: Track support ticket status
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     serviceType:
 *                       type: string
 *                     issueType:
 *                       type: string
 *                     status:
 *                       type: string
 *                     description:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                     ride:
 *                       type: object
 *                       nullable: true
 *                     order:
 *                       type: object
 *                       nullable: true
 *                     booking:
 *                       type: object
 *                       nullable: true
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 */
router.get('/:ticketId', checkPermissions('track_support_ticket'), supportValidation.validateTrackTicketStatus, supportController.trackTicketStatus);

/**
 * @swagger
 * /api/customer/mtxi/support/escalate:
 *   post:
 *     summary: Escalate a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 */
router.post('/escalate', checkPermissions('escalate_support_ticket'), supportValidation.validateEscalateTicket, supportController.escalateTicket);

/**
 * @swagger
 * /api/customer/mtxi/support/close:
 *   post:
 *     summary: Close a support ticket
 *     tags: [Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketId
 *             properties:
 *               ticketId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ticket closed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                     gamificationError:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 */
router.post('/close', checkPermissions('close_support_ticket'), supportValidation.validateCloseTicket, supportController.closeTicket);

module.exports = router;