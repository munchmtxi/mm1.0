// src/routes/customer/disputes/disputeRoutes.js
'use strict';

/**
 * Routes for customer dispute operations.
 */

const express = require('express');
const router = express.Router();
const disputeController = require('@controllers/customer/disputes/disputeController');
const disputeMiddleware = require('@middleware/customer/disputes/disputeMiddleware');
const disputeValidator = require('@validators/customer/disputes/disputeValidator');

/**
 * @swagger
 * /api/customer/disputes:
 *   post:
 *     summary: Submit a dispute for a service
 *     description: Creates a dispute for a booking, order, ride, parking, or in-dining order. Sends a notification, logs an audit, emits a socket event, and awards gamification points.
 *     tags:
 *       - Customer Disputes
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
 *               - issue
 *               - issueType
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 description: ID of the service
 *                 example: 123
 *               issue:
 *                 type: string
 *                 description: Description of the issue (max 500 characters)
 *                 example: Service was not as described
 *               issueType:
 *                 type: string
 *                 enum: [BOOKING, PAYMENT, SERVICE_QUALITY, PARKING, DINING, OTHER]
 *                 description: Type of issue
 *                 example: SERVICE_QUALITY
 *     responses:
 *       201:
 *         description: Dispute created successfully
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
 *                   example: Dispute created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     disputeId:
 *                       type: integer
 *                       example: 123
 *                     serviceType:
 *                       type: string
 *                       enum: [mtables, munch, mtxi, mpark, in_dining]
 *                       example: mtables
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or creation failure
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
 *                   example: ["Issue is required"]
 *       403:
 *         description: Unauthorized dispute
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
 *                   example: Unauthorized dispute
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED_DISPUTE
 *       404:
 *         description: Customer or service not found
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
 *                   example: INVALID_SERVICE
 *       429:
 *         description: Max disputes exceeded
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
 *                   example: Maximum disputes per day exceeded
 *                 code:
 *                   type: string
 *                   example: MAX_DISPUTES_EXCEEDED
 */

/**
 * @swagger
 * /api/customer/disputes/{disputeId}/status:
 *   get:
 *     summary: Track dispute status
 *     description: Retrieves the status and details of a dispute.
 *     tags:
 *       - Customer Disputes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: disputeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the dispute
 *         example: 123
 *     responses:
 *       200:
 *         description: Dispute status retrieved successfully
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
 *                   example: Dispute status retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       enum: [PENDING, RESOLVED, CLOSED]
 *                       example: PENDING
 *                     serviceType:
 *                       type: string
 *                       enum: [mtables, munch, mtxi, mpark, in_dining]
 *                       example: mtables
 *                     issue:
 *                       type: string
 *                       example: Service was not as described
 *                     issueType:
 *                       type: string
 *                       enum: [BOOKING, PAYMENT, SERVICE_QUALITY, PARKING, DINING, OTHER]
 *                       example: SERVICE_QUALITY
 *                     resolution:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Invalid request or dispute not found
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
 *                   example: Dispute not found
 *                 code:
 *                   type: string
 *                   example: DISPUTE_NOT_FOUND
 *       403:
 *         description: Unauthorized dispute
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
 *                   example: Unauthorized dispute
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED_DISPUTE
 */

/**
 * @swagger
 * /api/customer/disputes/resolve:
 *   post:
 *     summary: Resolve a dispute
 *     description: Resolves a dispute with an outcome, sends notification, logs audit, emits socket event, and awards gamification points.
 *     tags:
 *       - Customer Disputes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disputeId
 *               - resolution
 *               - resolutionType
 *             properties:
 *               disputeId:
 *                 type: integer
 *                 description: ID of the dispute
 *                 example: 123
 *               resolution:
 *                 type: string
 *                 description: Resolution description (max 500 characters)
 *                 example: Refund issued
 *               resolutionType:
 *                 type: string
 *                 enum: [REFUND, COMPENSATION, APOLOGY, NO_ACTION, ACCOUNT_CREDIT, REPLACEMENT]
 *                 description: Type of resolution
 *                 example: REFUND
 *     responses:
 *       200:
 *         description: Dispute resolved successfully
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
 *                   example: Dispute resolved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     disputeId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: RESOLVED
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or resolution failure
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
 *                   example: ["Resolution is required"]
 *       404:
 *         description: Dispute not found
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
 *                   example: Dispute not found
 *                 code:
 *                   type: string
 *                   example: DISPUTE_NOT_FOUND
 *       409:
 *         description: Dispute already resolved
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
 *                   example: Dispute already resolved
 *                 code:
 *                   type: string
 *                   example: DISPUTE_ALREADY_RESOLVED
 */

/**
 * @swagger
 * /api/customer/disputes/parking:
 *   get:
 *     summary: Retrieve parking disputes
 *     description: Retrieves all parking disputes for the authenticated customer.
 *     tags:
 *       - Customer Disputes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Parking disputes retrieved successfully
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
 *                   example: Parking disputes retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 123
 *                       serviceId:
 *                         type: integer
 *                         example: 456
 *                       serviceType:
 *                         type: string
 *                         example: mpark
 *                       issue:
 *                         type: string
 *                         example: Parking issue
 *                       issueType:
 *                         type: string
 *                         enum: [BOOKING, PAYMENT, SERVICE_QUALITY, PARKING, DINING, OTHER]
 *                         example: PARKING
 *                       status:
 *                         type: string
 *                         enum: [PENDING, RESOLVED, CLOSED]
 *                         example: PENDING
 *                       resolution:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       bookingDetails:
 *                         type: object
 *                         nullable: true
 *                         properties:
 *                           bookingType:
 *                             type: string
 *                             example: valet
 *                           status:
 *                             type: string
 *                             example: confirmed
 *       400:
 *         description: Invalid request or no parking disputes found
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
 *                   example: No parking disputes found
 *                 code:
 *                   type: string
 *                   example: PARKING_DISPUTES_NOT_FOUND
 */

/**
 * @swagger
 * /api/customer/disputes/parking/cancel:
 *   post:
 *     summary: Cancel a parking dispute
 *     description: Cancels a pending parking dispute, sends notification, logs audit, emits socket event, and awards gamification points.
 *     tags:
 *       - Customer Disputes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - disputeId
 *             properties:
 *               disputeId:
 *                 type: integer
 *                 description: ID of the dispute
 *                 example: 123
 *     responses:
 *       200:
 *         description: Dispute closed successfully
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
 *                   example: Dispute closed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     disputeId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: CLOSED
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
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
 *       403:
 *         description: Unauthorized dispute
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
 *                   example: Unauthorized dispute
 *                 code:
 *                   type: string
 *                   example: UNAUTHORIZED_DISPUTE
 *       404:
 *         description: Dispute not found
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
 *                   example: Dispute not found
 *                 code:
 *                   type: string
 *                   example: DISPUTE_NOT_FOUND
 *       409:
 *         description: Dispute already resolved
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
 *                   example: Dispute already resolved
 *                 code:
 *                   type: string
 *                   example: DISPUTE_ALREADY_RESOLVED
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/',
  disputeMiddleware.restrictTo('customer'),
  disputeMiddleware.checkPermissions('create_dispute'),
  disputeValidator.validateCreateDispute,
  disputeMiddleware.validateDisputeAccess,
  disputeController.createDispute
);

router.get(
  '/:disputeId/status',
  disputeMiddleware.restrictTo('customer'),
  disputeMiddleware.checkPermissions('track_dispute'),
  disputeValidator.validateTrackDispute,
  disputeMiddleware.validateDisputeStatusAccess,
  disputeController.trackDisputeStatus
);

router.post(
  '/resolve',
  disputeMiddleware.restrictTo('admin', 'support'),
  disputeMiddleware.checkPermissions('resolve_dispute'),
  disputeValidator.validateResolveDispute,
  disputeMiddleware.validateResolveAccess,
  disputeController.resolveDispute
);

router.get(
  '/parking',
  disputeMiddleware.restrictTo('customer'),
  disputeMiddleware.checkPermissions('view_parking_disputes'),
  disputeController.getParkingDisputes
);

router.post(
  '/parking/cancel',
  disputeMiddleware.restrictTo('customer'),
  disputeMiddleware.checkPermissions('cancel_parking_dispute'),
  disputeValidator.validateTrackDispute,
  disputeMiddleware.validateDisputeStatusAccess,
  disputeController.cancelParkingDispute
);

module.exports = router;