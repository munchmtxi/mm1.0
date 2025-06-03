'use strict';

const express = require('express');
const router = express.Router();
const { createSplitPaymentPayment, processSplit } = require('@controllers/customer/payments/paymentSplitController');
const { splitPaymentValidator, refundSplitPaymentSchema } = require('@validators/customer/payments/paymentSplitValidator');
const { createSplitPayment, refundPayment } = require('@middleware/customer/payments/paymentSplitMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/payments/split:
 *   post:
 *     summary: Split payment for a service
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
 *               serviceId:
 *                 type: integer
 *               serviceType:
 *                 type: string
 *                 enum: [order, in_dining_order, booking, ride, event]
 *               payments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     paymentMethod:
 *                       type: string
 *     responses:
 *       200:
 *         description: Split payment processed
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
 *                     serviceId:
 *                     type: integer
 *                     serviceType:
 *                       type: string
 *                     splitPayments:
 *                       type: array
 *                       items:
 *                         type: object
 *                           properties:
 *                             paymentId:
 *                             type: integer
 *                             customerId:
 *                             type: integer
 *                             amount:
 *                             type: number
 *                             transactionId:
 *                             type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Service or wallet not found
 */
router.post('/split', createSplitPayment, validate(splitPaymentSchema), createSplitPayment);

/**
 * @swagger
 * /api/customer/payments/split/refund:
 *   post:
 *     summary: Process refunds for split payment
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
 *               serviceId:
 * type: integer
 *               serviceType:
 *                 type: string
 *                 enum: [order, in_dining_order, booking, ride, event]
 *               refunds:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     customerId:
 *                       type: integer
 *                     amount:
 *                       type: number
 *     responses:
 *       200:
 *         description: Refunds processed
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
 *                     serviceId:
 *                       type: integer
 *                     serviceType:
 *                       type: string
 *                     refunds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type: integer
                           customerId:
                           type: integer
                           amount:
                             type: number
                           transactionId:
                             type: integer
                       401:
                           description: Unauthorized
                       403:
                           description: Forbidden
                       400:
                           description: Invalid request
                       404:
                           description: Service or payment not found
                   */

router.post('/split/refund', refundPayment, validate(refundedSplitPaymentSchema), processSplitPayment);

module.exports = router;