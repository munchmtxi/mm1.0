'use strict';

/**
 * Routes for customer tip endpoints
 */

const express = require('express');
const router = express.Router();
const tipController = require('@controllers/customer/tipController');
const tipValidator = require('@validators/customer/tip/tipValidator');
const tipMiddleware = require('@middleware/customer/tip/tipMiddleware');
const { validate } = require('express-validation');

/**
 * @swagger
 * tags:
 *   - name: Customer Tips
 *     description: Customer tipping operations
 */

/**
 * @swagger
 * /api/v1/customer/tips:
 *   post:
 *     summary: Create a tip
 *     description: Creates a tip for a recipient associated with a specific service.
 *     tags: [Customer Tips]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId, recipientId, amount, currency]
 *             properties:
 *               customerId: { type: string, description: Customer ID }
 *               recipientId: { type: string, description: Recipient ID (driver, staff, or merchant) }
 *               amount: { type: number, description: Tip amount }
 *               currency: { type: string, description: Currency code (e.g., USD) }
 *               rideId: { type: string, description: Ride ID (optional) }
 *               orderId: { type: string, description: Order ID (optional) }
 *               bookingId: { type: string, description: Booking ID (optional) }
 *               eventServiceId: { type: string, description: Event Service ID (optional) }
 *               inDiningOrderId: { type: string, description: In-Dining Order ID (optional) }
 *               parkingBookingId: { type: string, description: Parking Booking ID (optional) }
 *     responses:
 *       201:
 *         description: Tip created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Tip created successfully for $10.00 USD }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tipId: { type: string }
 *                     amount: { type: number }
 *                     currency: { type: string }
 *                     status: { type: string }
 *                     rideId: { type: string, nullable: true }
 *                     orderId: { type: string, nullable: true }
 *                     bookingId: { type: string, nullable: true }
 *                     eventServiceId: { type: string, nullable: true }
 *                     inDiningOrderId: { type: string, nullable: true }
 *                     parkingBookingId: { type: string, nullable: true }
 *                     walletId: { type: string }
 *                     recipientWalletId: { type: string }
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', validate(tipValidator.createTip), tipMiddleware.validateTipCreation, tipController.createTip);

/**
 * @swagger
 * /api/v1/customer/tips/{tipId}:
 *   patch:
 *     summary: Update a tip
 *     description: Updates an existing tip's amount or status.
 *     tags: [Customer Tips]
 *     parameters:
 *       - in: path
 *         name: tipId
 *         required: true
 *         schema: { type: string }
 *         description: Tip ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerId]
 *             properties:
 *               customerId: { type: string, description: Customer ID }
 *               amount: { type: number, description: New tip amount (optional) }
 *               status: { type: string, description: New tip status (optional) }
 *     responses:
 *       200:
 *         description: Tip updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Tip updated successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     tipId: { type: string }
 *                     amount: { type: number }
 *                     currency: { type: string }
 *                     status: { type: string }
 *                     rideId: { type: string, nullable: true }
 *                     orderId: { type: string, nullable: true }
 *                     bookingId: { type: string, nullable: true }
 *                     eventServiceId: { type: string, nullable: true }
 *                     inDiningOrderId: { type: string, nullable: true }
 *                     parkingBookingId: { type: string, nullable: true }
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Tip not found
 *       500:
 *         description: Server error
 */
router.patch('/:tipId', validate(tipValidator.updateTip), tipController.updateTip);

/**
 * @swagger
 * /api/v1/customer/tips/{customerId}:
 *   get:
 *     summary: Get customer tip history
 *     description: Retrieves the tip history for a customer.
 *     tags: [Customer Tips]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema: { type: string }
 *         description: Customer ID
 *     responses:
 *       200:
 *         description: Tips retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 message: { type: string, example: Tips retrieved successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tipId: { type: string }
 *                       amount: { type: number }
 *                       currency: { type: string }
 *                       status: { type: string }
 *                       rideId: { type: string, nullable: true }
 *                       orderId: { type: string, nullable: true }
 *                       bookingId: { type: string, nullable: true }
 *                       eventServiceId: { type: string, nullable: true }
 *                       inDiningOrderId: { type: string, nullable: true }
 *                       parkingBookingId: { type: string, nullable: true }
 *                       recipientName: { type: string }
 *                       createdAt: { type: string }
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:customerId', validate(tipValidator.getCustomerTips), tipController.getCustomerTips);

module.exports = router;