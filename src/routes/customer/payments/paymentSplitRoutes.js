'use strict';

/**
 * Routes for split payment and refund endpoints.
 */

const express = require('express');
const router = express.Router();
const paymentSplitController = require('@controllers/customer/payments/splitPaymentController');
const paymentSplitValidator = require('@validators/customer/payments/paymentSplitValidator');

/**
 * @swagger
 * /customer/payments/split:
 *   post:
 *     summary: Initiate a split payment
 *     description: Initiates a split payment for a service (order, in-dining order, booking, ride, or event).
 *     tags: [Customer Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, serviceType, payments, billSplitType]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service (e.g., order ID, ride ID).
 *                 example: "12345"
 *               serviceType:
 *                 type: string
 *                 enum: [order, in_dining_order, booking, ride, event]
 *                 description: Type of service.
 *                 example: "order"
 *               billSplitType:
 *                 type: string
 *                 enum: [EQUAL, CUSTOM, ITEMIZED, PERCENTAGE, SPONSOR_CONTRIBUTION]
 *                 description: Type of bill split.
 *                 example: "EQUAL"
 *               payments:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required: [customerId, amount, paymentMethod]
 *                   properties:
 *                     customerId:
 *                       type: string
 *                       description: ID of the customer making the payment.
 *                       example: "67890"
 *                     amount:
 *                       type: number
 *                       description: Payment amount.
 *                       example: 25.50
 *                     paymentMethod:
 *                       type: string
 *                       enum: [CREDIT_CARD, DEBIT_CARD, WALLET, APPLE_PAY, GOOGLE_PAY, PAYPAL]
 *                       description: Payment method.
 *                       example: "WALLET"
 *               location:
 *                 type: object
 *                 description: Location data for rides or in-dining orders.
 *                 properties:
 *                   lat:
 *                     type: number
 *                     example: 37.7749
 *                   lng:
 *                     type: number
 *                     example: -122.4194
 *     responses:
 *       200:
 *         description: Split payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment initiated for service order #12345"
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceId:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     billSplitType:
 *                       type: string
 *                     splitPayments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           paymentId:
 *                             type: string
 *                           customerId:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           transactionId:
 *                             type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 *       403:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 */
router.post('/split', paymentSplitValidator.validateSplitPayment, paymentSplitController.initiateSplitPayment);

/**
 * @swagger
 * /customer/payments/split/refund:
 *   post:
 *     summary: Process a split payment refund
 *     description: Processes refunds for a split payment of a service.
 *     tags: [Customer Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [serviceId, serviceType, refunds]
 *             properties:
 *               serviceId:
 *                 type: string
 *                 description: ID of the service.
 *                 example: "12345"
 *               serviceType:
 *                 type: string
 *                 enum: [order, in_dining_order, booking, ride, event]
 *                 description: Type of service.
 *                 example: "order"
 *               refunds:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [customerId, amount]
 *                   properties:
 *                     customerId:
 *                       type: string
 *                       description: ID of the customer receiving the refund.
 *                       example: "67890"
 *                     amount:
 *                       type: number
 *                       description: Refund amount.
 *                       example: 25.50
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Refund processed for service order #12345"
 *                 data:
 *                   type: object
 *                   properties:
 *                     serviceId:
 *                       type: string
 *                     serviceType:
 *                       type: string
 *                     refunds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           customerId:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           transactionId:
 *                             type: string
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 *       403:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppError'
 */
router.post('/split/refund', paymentSplitValidator.validateSplitPaymentRefund, paymentSplitController.processSplitPaymentRefund);

module.exports = router;