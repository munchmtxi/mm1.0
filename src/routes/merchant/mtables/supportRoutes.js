'use strict';

const express = require('express');
const router = express.Router();
const { inquiryAuth, disputeAuth, policyAuth } = require('@middleware/merchant/mtables/supportMiddleware');
const { validateHandleInquiry, validateResolveDispute, validateCommunicatePolicies } = require('@validators/merchant/mtables/supportValidator');
const { handleInquiryController, resolveDisputeController, communicatePoliciesController } = require('@controllers/merchant/mtables/supportController');

/**
 * @swagger
 * /merchant/mtables/support/inquiry:
 *   post:
 *     summary: Handle customer or staff inquiry
 *     description: Creates a support ticket for a customer inquiry related to a booking or order, assigns staff if provided, and awards points to the customer.
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
 *               - bookingId
 *               - customerId
 *               - issueType
 *               - description
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               customerId:
 *                 type: integer
 *                 description: ID of the customer
 *                 example: 456
 *               orderId:
 *                 type: integer
 *                 description: ID of the order (optional)
 *                 example: 789
 *               issueType:
 *                 type: string
 *                 description: Type of issue
 *                 enum: ['booking', 'order', 'payment', 'table']
 *                 example: payment
 *               description:
 *                 type: string
 *                 description: Issue description
 *                 maxLength: 1000
 *                 example: Payment was declined
 *               staffId:
 *                 type: integer
 *                 description: ID of the staff (optional)
 *                 example: 303
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
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Support ticket TKT-1625098765432-ABCDEF created.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     customer_id:
 *                       type: integer
 *                       example: 456
 *                     booking_id:
 *                       type: integer
 *                       example: 123
 *                     in_dining_order_id:
 *                       type: integer
 *                       example: 789
 *                     assigned_staff_id:
 *                       type: integer
 *                       example: 303
 *                     ticket_number:
 *                       type: string
 *                       example: TKT-1625098765432-ABCDEF
 *                     service_type:
 *                       type: string
 *                       example: mtables
 *                     issue_type:
 *                       type: string
 *                       example: payment
 *                     description:
 *                       type: string
 *                       example: Payment was declined
 *                     status:
 *                       type: string
 *                       example: open
 *                     priority:
 *                       type: string
 *                       example: high
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Customer, booking, or order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/inquiry', inquiryAuth, validateHandleInquiry, handleInquiryController);

/**
 * @swagger
 * /merchant/mtables/support/dispute:
 *   post:
 *     summary: Resolve a support dispute
 *     description: Updates a support ticket to resolved status with resolution details, notifies customer, and awards points for ticket closure.
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
 *               - bookingId
 *               - ticketId
 *               - staffId
 *               - resolutionDetails
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               ticketId:
 *                 type: integer
 *                 description: ID of the support ticket
 *                 example: 101
 *               staffId:
 *                 type: integer
 *                 description: ID of the staff resolving the ticket
 *                 example: 303
 *               resolutionDetails:
 *                 type: string
 *                 description: Details of the resolution
 *                 maxLength: 1000
 *                 example: Refund issued
 *     responses:
 *       200:
 *         description: Support ticket resolved successfully
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
 *                   example: Support ticket TKT-1625098765432-ABCDEF resolved.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     status:
 *                       type: string
 *                       example: resolved
 *                     resolution_details:
 *                       type: string
 *                       example: Refund issued
 *       400:
 *         description: Invalid input or ticket already resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ticket or booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/dispute', disputeAuth, validateResolveDispute, resolveDisputeController);

/**
 * @swagger
 * /merchant/mtables/support/policies:
 *   post:
 *     summary: Communicate refund and cancellation policies
 *     description: Sends refund and cancellation policies to the customer associated with a booking and logs the communication.
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
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 789
 *     responses:
 *       200:
 *         description: Policies successfully communicated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: Refund policy applied successfully
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               $ref: '#/components/schemas/Error'
 *       application401:
 *         description: Unauthorized
 *           application/json:
 *             type: object
 *               $schema:
 *               $ref: '#/components/schemas/Error'
 *       application403:
 *         description: Forbidden
 *           application/json:
 *             type: object
 *               schema:
 *                 $ref: '#/components/schemas/Error'
 *       application404:
 *         description: Booking not found
 *           application/json:
 *             type: object
 *               schema:
 *                 $ref: '#/components/schemas/Error'
 */
router.post('/policies', policyAuth, requests, validateCommunicationPolicies, communicatePoliciesController );

module.exports = router;