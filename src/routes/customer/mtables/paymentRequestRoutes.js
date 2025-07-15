// src/routes/customer/mtables/paymentRequestRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const paymentRequestController = require('@controllers/customer/mtables/paymentRequestController');
const paymentRequestMiddleware = require('@middleware/customer/mtables/paymentRequestMiddleware');

/**
 * @swagger
 * tags:
 *   name: Payment Requests
 *   description: API endpoints for managing payment requests in mtables
 */

/**
 * @swagger
 * /customer/mtables/payment-requests:
 *   post:
 *     summary: Send a payment request for a booking
 *     tags: [Payment Requests]
 *     description: Initiates a payment request for a booking, splitting the amount equally among participants.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - amount
 *               - billSplitType
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               amount:
 *                 type: number
 *                 description: Total amount to split (1-10000)
 *                 example: 100
 *               billSplitType:
 *                 type: string
 *                 enum: [equal, custom, itemized, percentage, sponsor_contribution]
 *                 description: Type of bill split
 *                 example: equal
 *     responses:
 *       200:
 *         description: Payment request sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       booking_id:
 *                         type: integer
 *                         example: 123
 *                       customer_id:
 *                         type: integer
 *                         example: 456
 *                       amount:
 *                         type: number
 *                         example: 25.00
 *                       currency:
 *                         type: string
 *                         example: USD
 *                       status:
 *                         type: string
 *                         example: pending
 *                       reference:
 *                         type: string
 *                         example: PR-1698765432000-ABCDEF
 *                 message:
 *                   type: string
 *                   example: Payment request for 100 sent for booking 123.
 *       400:
 *         description: Invalid input or error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid input provided.
 *                 errorCode:
 *                   type: string
 *                   example: INVALID_INPUT
 */
router.post('/payment-requests', paymentRequestMiddleware.validatePaymentRequest, paymentRequestController.sendPaymentRequest);

/**
 * @swagger
 * /customer/mtables/pre-order-payment-requests:
 *   post:
 *     summary: Send a pre-order payment request
 *     tags: [Payment Requests]
 *     description: Initiates a payment request for a pre-order associated with a booking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - orderId
 *               - amount
 *               - billSplitType
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: ID of the booking
 *                 example: 123
 *               orderId:
 *                 type: integer
 *                 description: ID of the pre-order
 *                 example: 789
 *               amount:
 *                 type: number
 *                 description: Total amount to split (1-10000)
 *                 example: 100
 *               billSplitType:
 *                 type: string
 *                 enum: [equal, custom, itemized, percentage, sponsor_contribution]
 *                 description: Type of bill split
 *                 example: equal
 *     responses:
 *       200:
 *         description: Pre-order payment request sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentRequests:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 2
 *                           booking_id:
 *                             type: integer
 *                             example: 123
 *                           customer_id:
 *                             type: integer
 *                             example: 456
 *                           amount:
 *                             type: number
 *                             example: 25.00
 *                           currency:
 *                             type: string
 *                             example: USD
 *                           status:
 *                             type: string
 *                             example: pending
 *                           reference:
 *                             type: string
 *                             example: PR-PRE-1698765432000-ABCDEF
 *                           order_id:
 *                             type: integer
 *                             example: 789
 *                     order:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 789
 *                         order_type:
 *                           type: string
 *                           example: pre_order
 *                         currency:
 *                           type: string
 *                           example: USD
 *                 message:
 *                   type: string
 *                   example: Pre-order payment request for 100 sent for order 789.
 *       400:
 *         description: Invalid input or error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid input provided.
 *                 errorCode:
 *                   type: string
 *                   example: INVALID_INPUT
 */
router.post('/pre-order-payment-requests', paymentRequestMiddleware.validatePreOrderPaymentRequest, paymentRequestController.sendPreOrderPaymentRequest);

module.exports = router;