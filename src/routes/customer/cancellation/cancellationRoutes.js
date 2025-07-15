'use strict';

/**
 * Routes for customer cancellation and refund.
 */
const express = require('express');
const router = express.Router();
const cancellationController = require('@controllers/customer/cancellation/cancellationController');
const cancellationMiddleware = require('@middleware/customer/cancellation/cancellationMiddleware');
const cancellationValidator = require('@validators/customer/cancellation/cancellation/cancellationValidator');

/**
 * @swagger
 * /api/customer/cancellation:
 *   post:
 *     summary: Cancel a customer service
 *     description: Allows a customer to cancel a booking, order, ride, in-dining order, or parking booking. Updates associated EventService and Event records if applicable. Emits a socket event, sends a notification, and awards gamification points.
 *     tags:
 *       - Customer Cancellation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - serviceType
 *               - reason
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 description: ID of the service to cancel
 *                 example: 123
 *               serviceType:
 *                 type: string
 *                 enum: [mtables, munch, mtxi, in_dining, mpark]
 *                 description: Type of service to cancel
 *                 example: mpark
 *               reason:
 *                 type: string
 *                 description: Reason for cancellation
 *                 example: Change of plans
 *     responses:
 *       200:
 *         description: Service successfully cancelled
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
 *                     serviceType:
 *                       type: string
 *                       enum: [mtables, munch, mtxi, in_dining, mpark]
 *                       example: mpark
 *                     reference:
 *                       type: string
 *                       description: Reference number or ID of the cancelled service
 *                       example: 123
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *                       description: Error details if gamification points failed, null if successful
 *       400:
 *         description: Invalid request parameters or cancellation failure
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service not found
 *       409:
 *         description: Service already cancelled
 */

/**
 * @swagger
 * /api/customer/cancellation/refund:
 *   post:
 *     summary: Issue a refund for a cancelled service
 *     description: Processes a refund for a cancelled booking, order, ride, in-dining order, or parking booking. Handles split payments for events and updates EventService records.
 *     tags:
 *       - Customer Cancellation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - walletId
 *               - serviceType
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 description: ID of the cancelled service
 *                 example: 123
 *               walletId:
 *                 type: integer
 *                 description: ID of the wallet to receive the refund
 *                 example: 456
 *               serviceType:
 *                 type: string
 *                 enum: [mtables, munch, mtxi, in_dining, mpark]
 *                 description: Type of service
 *                 example: mpark
 *     responses:
 *       200:
 *         description: Refund successfully processed
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
 *                     refundId:
 *                       type: integer
 *                       description: ID of the refunded payment
 *                       example: 789
 *                     amount:
 *                       type: number
 *                       description: Refund amount
 *                       example: 50.00
 *                     currency:
 *                       type: string
 *                       description: Currency of the refund
 *                       example: USD
 *       400:
 *         description: Invalid request parameters or refund failure
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Service or wallet not found
 */

router.post(
  '/',
  cancellationValidator.validateCancellation,
  cancellationMiddleware.validateCancellationAccess,
  cancellationController.processCancellation
);

router.post(
  '/refund',
  cancellationValidator.validateRefund,
  cancellationMiddleware.validateRefundAccess,
  cancellationController.issueRefund
);

module.exports = router;