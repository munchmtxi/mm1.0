'use strict';

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
 *     description: Creates a dispute for a booking, order, or ride. Sends a notification, logs an audit, emits a socket event, and awards gamification points automatically.
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
 *                 description: Description of the issue
 *                 example: Service was not as described
 *               issueType:
 *                 type: string
 *                 enum: [service_quality, payment, other]
 *                 description: Type of issue
 *                 example: service_quality
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
 *                       enum: [mtables, munch, mtxi]
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
 properties:
    id:
      type: integer
      example: 123
    status:
      type: string
      enum: pending|resolved|closed
      example: pending
      serviceType:
        type: string
        enum: [mtables, munch, mtxi]
        example: mtables
      issue:
        type: string
        example: Service was not as described
      issueType:
        type: string
        enum: [service_quality, payment, other]
        example: service_quality
      resolution:
        type: string
        nullable: true
        example: null
400:
  description: Invalid request or dispute not found
  content:
    application/json:
      schema:
        type: object
        properties:
          status:
            type: string
            example: error
          message:
            type: string
            example: Dispute not found
          code:
            type: string
            example: DISPUTE_NOT_FOUND
401:
  description: Unauthorized
  content:
    application/json:
      schema:
        type: object
        properties:
          status:
            type: string
            example: error
          message:
            type: string
            example: Unauthorized
          code:
            type: error
            example: UNAUTHORIZED
403:
  description: Forbidden
  content:
    application/json:
      schema:
        type: object
        properties:
          status:
            type: string
            example: error
          message:
            type: string
            example: Forbidden
          code:
            type: string
            example: PERMISSION_DENIED

/**
 * @swagger
 * /api/customer/disputes/resolve:
 *   post:
 *     summary: Resolve a dispute
 *     description: Resolves a dispute with an outcome, sends notification, logs audit, emits socket event, and awards gamification points automatically.
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
 *               required:
 *                 - disputeId
 *                 - resolution
 *                 - resolutionType
 *             properties:
 *               disputeId:
 *                 type: integer
 *                 description: ID of the dispute
 *                   example: 123
 *               resolution:
 *                 type: string
 *                 description: Resolution description
 *                   example: Refund issued
 *               resolutionType:
 *                 type: string
 *                 enum: [refund, compensation, other]
 *                 description: Type of resolution
 *                 example: refund
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
 *                       example: resolved
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
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/',
  disputeMiddleware.authenticate,
  disputeMiddleware.restrictTo('customer'),
  disputeMiddleware.checkPermissions('create_dispute'),
  disputeValidator.validateCreateDispute,
  disputeMiddleware.validateDisputeAccess,
  disputeController.createDispute
);

router.get(
  '/:disputeId/status',
  disputeMiddleware.authenticate,
  disputeMiddleware.restrictTo('customer'),
  disputeMiddleware.checkPermissions('track_dispute'),
  disputeValidator.validateTrackDispute,
  disputeMiddleware.validateDisputeStatusAccess,
  disputeController.trackDisputeStatus
);

router.post(
  '/resolve',
  disputeMiddleware.authenticate,
  disputeMiddleware.restrictTo('admin', 'support'),
  disputeMiddleware.checkPermissions('resolve_dispute'),
  disputeValidator.validateResolveDispute,
  disputeMiddleware.validateResolveAccess,
  disputeController.resolveDispute
);

module.exports = router;