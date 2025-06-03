'use strict';

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
 *     description: Allows a customer to cancel a booking, order, ride, or in-dining order. Updates associated EventService and Event records if applicable. Emits a socket event, sends a notification, and awards gamification points.
 *     tags:
 *       - Customer Cancellation
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [mtables, munch, mtxi, in_dining]
 *                 description: Type of service to cancel
 *                 example: mtables
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
 *                       enum: [mtables, munch, mtxi, in_dining]
 *                       example: mtables
 *                     reference:
 *                       type: string
 *                       description: Reference number or ID of the cancelled service
 *                       example: BK12345
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid request parameters
 *                 code:
 *                   type: string
 *                   example: INVALID_REQUEST
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Service ID must be a positive integer", "Reason is required"]
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Forbidden
 *                 code:
 *                   type: string
 *                   example: PERMISSION_DENIED
 *       404:
 *         description: Service not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Service not found
 *                 code:
 *                   type: string
 *                   example: SERVICE_NOT_FOUND
 *       409:
 *         description: Service already cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Service already cancelled
 *                 code:
 *                   type: string
 *                   example: SERVICE_ALREADY_CANCELLED
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Authentication error
 *                 code:
 *                   type: string
 *                   example: AUTH_ERROR
 */

/**
 * @swagger
 * /api/customer/cancellation/refund:
 *   post:
 *     summary: Issue a refund for a cancelled service
 *     description: Processes a refund for a cancelled booking, order, ride, or in-dining order. Handles split payments for events and updates EventService records.
 *     tags:
 *       - Customer Cancellation
 *     security:
 *       - bearerAuth: []
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
 *                 enum: [mtables, munch, mtxi, in_dining]
 *                 description: Type of service
 *                 example: mtables
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Invalid request parameters
 *                 code:
 *                   type: string
 *                   example: INVALID_REQUEST
 *                 details:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Wallet ID must be a positive integer"]
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Unauthorized
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Forbidden
 *                 code:
 *                   type: string
 *                   example: PERMISSION_DENIED
 *       404:
 *         description: Service or wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Service not found
 *                 code:
 *                   type: string
 *                   example: SERVICE_NOT_FOUND
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/',
  cancellationMiddleware.authenticate,
  cancellationMiddleware.restrictTo('customer'),
  cancellationMiddleware.checkPermissions('cancel_service'),
  cancellationValidator.validateCancellation,
  cancellationMiddleware.validateCancellationAccess,
  cancellationController.processCancellation
);

router.post(
  '/refund',
  cancellationMiddleware.authenticate,
  cancellationMiddleware.restrictTo('customer'),
  cancellationMiddleware.checkPermissions('issue_refund'),
  cancellationValidator.validateRefund,
  cancellationMiddleware.validateRefundAccess,
  cancellationController.issueRefund
);

module.exports = router;