'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('@controllers/admin/mtables/paymentController');
const paymentMiddleware = require('@middleware/admin/mtables/paymentMiddleware');
const paymentConstants = require('@constants/paymentConstants');
const mtablesConstants = require('@constants/admin/mtablesConstants');

/**
 * @swagger
 * /admin/mtables/payments/process:
 *   post:
 *     summary: Process a booking payment
 *     description: Handles payment for a booking using a wallet.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               walletId:
 *                 type: integer
 *                 description: ID of the wallet
 *             required: [bookingId, amount, walletId]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId:
 *                       type: integer
 *                     paymentId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid payment details or insufficient funds
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking or wallet not found
 */
router.post(
  '/process',
  paymentMiddleware.validateProcessPayment,
  paymentMiddleware.checkManagePaymentsPermission,
  paymentController.processPayment
);

/**
 * @swagger
 * /admin/mtables/payments/split:
 *   post:
 *     summary: Manage split payments
 *     description: Facilitates group split payments for a booking.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *               payments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                       description: ID of the customer
 *                     amount:
 *                       type: number
 *                       description: Payment amount
 *                     walletId:
 *                       type: integer
 *                       description: ID of the wallet
 *                 required: [customerId, amount, walletId]
 *             required: [bookingId, payments]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId:
 *                       type: integer
 *                     orderId:
 *                       type: integer
 *                     payments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           paymentId:
 *                             type: integer
 *                           amount:
 *                             type: number
 *                           customerId:
 *                             type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid split payment details or amount mismatch
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking, order, or wallet not found
 */
router.post(
  '/split',
  paymentMiddleware.validateManageSplitPayments,
  paymentMiddleware.checkManagePaymentsPermission,
  paymentController.manageSplitPayments
);

/**
 * @swagger
 * /admin/mtables/payments/refund:
 *   post:
 *     summary: Issue a refund
 *     description: Processes a refund for a booking payment.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *               walletId:
 *                 type: integer
 *                 description: ID of the wallet
 *             required: [bookingId, walletId]
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     bookingId:
 *                       type: integer
 *                     paymentId:
 *                       type: integer
 *                     refundAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid refund details
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking, order, payment, or wallet not found
 */
router.post(
  '/refund',
  paymentMiddleware.validateIssueRefund,
  paymentMiddleware.checkManagePaymentsPermission,
  paymentController.issueRefund
);

module.exports = router;