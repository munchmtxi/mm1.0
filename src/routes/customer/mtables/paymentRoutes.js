'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('@controllers/customer/mtables/paymentController');
const paymentMiddleware = require('@middleware/customer/mtables/paymentMiddleware');
const paymentValidator = require('@validators/customer/mtables/paymentValidator');

/**
 * @swagger
 * /api/customer/mtables/payments:
 *   post:
 *     summary: Process a payment
 *     description: Processes a payment for a booking or order, sends notifications, logs audit, emits socket event, and awards points.
 *     tags:
 *       - Customer Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - walletId
 *               - type
 *             properties:
 *               id:
 *                 type: integer
 *                 description: Booking or Order ID
 *                 example: 123
 *               amount:
 *                 type: number
 *                 description: Payment amount (if not split)
 *                 example: 50.00
 *               walletId:
 *                 type: integer
 *                 description: Wallet ID
 *                 example: 456
 *               paymentMethodId:
 *                 type: integer
 *                 description: Payment method ID
 *                 example: 789
 *               splitPayments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     walletId: { type: integer, example: 456 }
 *                     amount: { type: number, example: 25.00 }
 *                     paymentMethodId: { type: integer, example: 789 }
 *               type:
 *                 type: string
 *                 description: Type of payment
 *                 example: order
 *                 enum: [booking, order]
 *     responses:
 *       200:
 *         description: Payment processed
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
 *                   example: Payment processed
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: integer
 *                       example: 123
 *                     amount:
 *                       type: number
 *                       example: 50.00
 *                     transactions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: integer, example: 456 }
 *                           amount: { type: number, example: 50.00 }
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request or payment failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 * /api/customer/mtables/payments/refund:
 *   post:
 *     summary: Issue a refund
 *     description: Issues a refund for a payment, sends notifications, logs audit, and emits socket event.
 *     tags:
 *       - Customer Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - walletId
 *               - transactionId
 *               - type
 *             properties:
 *               id:
 *                 type: integer
 *                 description: Booking or Order ID
 *                 example: 123
 *               walletId:
 *                 type: integer
 *                 description: Wallet ID
 *                 example: 456
 *               transactionId:
 *                 type: integer
 *                 description: Transaction ID
 *                 example: 789
 *               type:
 *                 type: string
 *                 description: Type of payment
 *                 example: order
 *                 enum: [booking, order]
 *     responses:
 *       200:
 *         description: Refund processed
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
 *                   example: Refund processed
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: integer
 *                       example: 456
 *                     amount:
 *                       type: number
 *                       example: 50.00
 *       400:
 *         description: Invalid request or refund failure
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
/**
 * @swagger
 * /api/customer/mtables/payments/{bookingId}/payment-request:
 *   post:
 *     summary: Send payment request for bill splitting
 *     description: Sends payment requests to party members for bill splitting, logs audit, and emits socket event.
 *     tags:
 *       - Customer Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema: { type: integer }
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - billSplitType
 *             properties:
 *               amount: { type: number, example: 100.00 }
 *               billSplitType: { type: string, example: equal }
 *     responses:
 *       200:
 *         description: Bill split processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Bill split processed }
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId: { type: integer, example: 123 }
 *                     paymentRequests: { type: array, items: { type: object, properties: { id: { type: integer }, customerId: { type: integer }, amount: { type: number } } } }
 *       400: { description: Invalid request }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */

router.post(
  '/payments',
  paymentMiddleware.authenticate,
  paymentMiddleware.restrictTo('customer'),
  paymentMiddleware.checkPermissions('process_payment'),
  paymentValidator.validateProcessPayment,
  paymentMiddleware.checkPaymentAccess,
  paymentController.processPayment
);

router.post(
  '/payments/refund',
  paymentMiddleware.authenticate,
  paymentMiddleware.restrictTo('customer'),
  paymentMiddleware.checkPermissions('issue_refund'),
  paymentValidator.validateIssueRefund,
  paymentMiddleware.checkPaymentAccess,
  paymentController.issueRefund
);

router.post(
  '/:bookingId/payment-request',
  bookingMiddleware.verifyCustomer,
  paymentValidator.validateSendPaymentRequest,
  bookingMiddleware.checkBookingAccess,
  paymentController.sendPaymentRequest
);

module.exports = router;