'use strict';

const express = require('express');
const router = express.Router();
const { paymentAuth, splitPaymentAuth, refundAuth } = require('@middleware/merchant/mtables/paymentMiddleware');
const { validateProcessPayment, validateManageSplitPayments, validateIssueRefund } = require('@validators/merchant/mtables/paymentValidator');
const { processPaymentController, manageSplitPaymentsController, issueRefundController } = require('@controllers/merchant/mtables/paymentController');

/**
 * @swagger
 * /merchant/mtables/payments/process:
 *   post:
 *     summary: Process a payment for a booking
 *     description: Processes a single payment for an in-dining order associated with a booking. Validates booking, wallet, and amount, then creates a payment record. Points are awarded automatically for the customer.
 *     tags: [Payments]
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
 *               - amount
 *               - walletId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *                 example: 50.00
 *               walletId:
 *                 type: integer
 *                 description: ID of the customer's wallet
 *                 example: 456
 *               paymentMethodId:
 *                 type: integer
 *                 description: ID of the payment method (optional)
 *                 example: 789
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
 *                   example: Payment of 50.00 completed for order 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     in_dining_order_id:
 *                       type: integer
 *                       example: 123
 *                     customer_id:
 *                       type: integer
 *                       example: 456
 *                     merchant_id:
 *                       type: integer
 *                       example: 789
 *                     amount:
 *                       type: number
 *                       example: 50.00
 *                     status:
 *                       type: string
 *                       example: completed
 *                     transaction_id:
 *                       type: string
 *                       example: TXN-1625098765432-ABCDEF
 *                     currency:
 *                       type: string
 *                       example: USD
 *       400:
 *         description: Invalid input or payment failure
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
 *         description: Booking or wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/process', paymentAuth, validateProcessPayment, processPaymentController);

/**
 * @swagger
 * /merchant/mtables/payments/split:
 *   post:
 *     summary: Manage split payments for a booking
 *     description: Processes multiple payments from different customers for a single in-dining order. Validates each customer, wallet, and amount, ensuring the total matches the order amount. Points are awarded for each customer.
 *     tags: [Payments]
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
 *               - payments
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               payments:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - customerId
 *                     - amount
 *                     - walletId
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                       description: ID of the customer
 *                       example: 456
 *                     amount:
 *                       type: number
 *                       description: Payment amount by the customer
 *                       example: 25.00
 *                     walletId:
 *                       type: integer
 *                       description: ID of the customer's wallet
 *                       example: 789
 *                     paymentMethodId:
 *                       type: integer
 *                       description: ID of the payment method (optional)
 *                       example: 101
 *     responses:
 *       200:
 *         description: Split payments processed successfully
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
 *                   example: Payment of 50.00 completed for order 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 101
 *                           in_dining_order_id:
 *                             type: integer
 *                             example: 123
 *                           customer_id:
 *                             type: integer
 *                             example: 456
 *                           merchant_id:
 *                             type: integer
 *                             example: 789
 *                           amount:
 *                             type: number
 *                             example: 25.00
 *                           status:
 *                             type: string
 *                             example: completed
 *                           transaction_id:
 *                             type: string
 *                             example: TXN-1625098765432-ABCDEF
 *                           currency:
 *                             type: string
 *                             example: USD
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 123
 *                         payment_status:
 *                           type: string
 *                           example: completed
 *       400:
 *         description: Invalid input or payment failure
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
 *         description: Booking or customer not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/split', splitPaymentAuth, validateManageSplitPayments, manageSplitPaymentsController);

/**
 * @swagger
 * /merchant/mtables/payments/refund:
 *   post:
 *     summary: Issue a refund for a booking
 *     description: Issues a refund for a completed in-dining order, validating the wallet and amount. Creates a negative payment record. Points are awarded for the customer.
 *     tags: [Payments]
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
 *               - walletId
 *               - amount
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               walletId:
 *                 type: integer
 *                 description: ID of the customer's wallet
 *                 example: 456
 *               amount:
 *                 type: number
 *                 description: Refund amount
 *                 example: 50.00
 *     responses:
 *       200:
 *         description: Refund issued successfully
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
 *                   example: Refund of 50.00 issued for order 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 101
 *                     in_dining_order_id:
 *                       type: integer
 *                       example: 123
 *                     customer_id:
 *                       type: integer
 *                       example: 456
 *                     merchant_id:
 *                       type: integer
 *                       example: 789
 *                     amount:
 *                       type: number
 *                       example: -50.00
 *                     status:
 *                       type: string
 *                       example: completed
 *                     transaction_id:
 *                       type: string
 *                       example: RFN-1625098765432-ABCDEF
 *                     currency:
 *                       type: string
 *                       example: USD
 *       400:
 *         description: Invalid input or refund failure
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
 *         description: Booking or wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refund', refundAuth, validateIssueRefund, issueRefundController);

module.exports = router;