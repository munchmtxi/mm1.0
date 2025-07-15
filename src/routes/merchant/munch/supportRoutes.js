'use strict';

const express = require('express');
const router = express.Router();
const {
  handleOrderInquiryAuth,
  resolveOrderDisputeAuth,
  shareOrderPoliciesAuth,
} = require('@middleware/merchant/munch/supportMiddleware');
const {
  validateHandleOrderInquiry,
  validateResolveOrderDispute,
  validateShareOrderPolicies,
} = require('@validators/merchant/munch/supportValidator');
const {
  handleOrderInquiryController,
  resolveOrderDisputeController,
  shareOrderPoliciesController,
} = require('@controllers/merchant/munch/supportController');

/**
 * @swagger
 * /merchant/munch/support/inquiry:
 *   post:
 *     summary: Handle order inquiry
 *     description: Creates a support ticket for order-related issues and assigns it to available staff.
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
 *               - orderId
 *               - issue
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               issue:
 *                 type: object
 *                 required:
 *                   - type
 *                   - description
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [PAYMENT_ISSUE, SERVICE_QUALITY, CANCELLATION, DELIVERY_ISSUE, ORDER_ISSUE, OTHER]
 *                     example: DELIVERY_ISSUE
 *                   description:
 *                     type: string
 *                     example: Order was delivered late
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     example: medium
 *     responses:
 *       200:
 *         description: Inquiry submitted
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
 *                   example: Inquiry submitted for ticket TICKET-123, order ORD-123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                       example: 789
 *                     ticketNumber:
 *                       type: string
 *                       example: TICKET-123
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: open
 *       400:
 *         description: Invalid input or issue type
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/inquiry', handleOrderInquiryAuth, validateHandleOrderInquiry, handleOrderInquiryController);

/**
 * @swagger
 * /merchant/munch/support/dispute:
 *   post:
 *     summary: Resolve order dispute
 *     description: Resolves a support ticket, notifies the customer, and awards points for interaction.
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
 *               - orderId
 *               - resolution
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               resolution:
 *                 type: object
 *                 required:
 *                   - action
 *                   - details
 *                 properties:
 *                   action:
 *                     type: string
 *                     enum: [refund, replacement, discount, no_action]
 *                     example: refund
 *                   details:
 *                     type: string
 *                     example: Full refund issued due to late delivery
 *     responses:
 *       200:
 *         description: Dispute resolved
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
 *                   example: Dispute for ticket TICKET-123 resolved with refund.
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticketId:
 *                       type: integer
 *                       example: 789
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: resolved
 *                     resolutionAction:
 *                       type: string
 *                       example: refund
 *       400:
 *         description: Invalid input or resolution action
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
 *         description: Ticket or order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/dispute', resolveOrderDisputeAuth, validateResolveOrderDispute, resolveOrderDisputeController);

/**
 * @swagger
 * /merchant/munch/support/policies:
 *   post:
 *     summary: Share order policies
 *     description: Communicates refund and order policies to the customer.
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
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *     responses:
 *       200:
 *         description: Policies shared
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
 *                   example: Refund and order policies for order ORD-123 shared.
 *                 data:
 *                   type: object
 *                   properties:
 *                     notificationId:
 *                       type: integer
 *                       example: 456
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/policies', shareOrderPoliciesAuth, validateShareOrderPolicies, shareOrderPoliciesController);

module.exports = router;