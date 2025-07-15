'use strict';

const express = require('express');
const router = express.Router();
const disputeController = require('@controllers/admin/mtables/disputeController');
const disputeMiddleware = require('@middleware/admin/mtables/disputeMiddleware');
const disputeConstants = require('@constants/disputeConstants');

/**
 * @swagger
 * /admin/mtables/disputes/booking/{bookingId}:
 *   put:
 *     summary: Resolve a booking dispute
 *     description: Resolves a dispute related to a booking with a specified resolution type and description.
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Resolution type (e.g., REFUNDED, DISMISSED)
 *               description:
 *                 type: string
 *                 description: Optional resolution description (max 500 characters)
 *             required: [type]
 *     responses:
 *       200:
 *         description: Booking dispute resolved successfully
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
 *                     disputeId:
 *                       type: integer
 *                     bookingId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     resolution:
 *                       type: string
 *                     resolutionType:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid booking ID or resolution type
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking or dispute not found
 */
router.put(
  '/booking/:bookingId',
  disputeMiddleware.validateResolveBookingDisputes,
  disputeMiddleware.checkManageDisputesPermission,
  disputeController.resolveBookingDisputes
);

/**
 * @swagger
 * /admin/mtables/disputes/pre-order/{bookingId}:
 *   put:
 *     summary: Resolve a pre-order dispute
 *     description: Resolves a dispute related to a pre-order for a booking.
 *     tags: [Disputes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Resolution type (e.g., REFUNDED, DISMISSED)
 *               description:
 *                 type: string
 *                 description: Optional resolution description (max 500 characters)
 *             required: [type]
 *     responses:
 *       200:
 *         description: Pre-order dispute resolved successfully
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
 *                     disputeId:
 *                       type: integer
 *                     bookingId:
 *                       type: integer
 *                     orderId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     resolution:
 *                       type: string
 *                     resolutionType:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid booking ID or resolution type
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking, pre-order, or dispute not found
 */
router.put(
  '/pre-order/:bookingId',
  disputeMiddleware.validateResolvePreOrderDisputes,
  disputeMiddleware.checkManageDisputesPermission,
  disputeController.resolvePreOrderDisputes
);

/**
 * @swagger
 * /admin/mtables/disputes/status/{disputeId}:
 *   get:
 *     summary: Track dispute resolution status
 *     description: Retrieves the current status and details of a dispute.
 *     tags: [Disputes]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     disputeId:
 *                       type: integer
 *                     serviceId:
 *                       type: integer
 *                     serviceType:
 *                       type: string
 *                     status:
 *                       type: string
 *                     issueType:
 *                       type: string
 *                     resolution:
 *                       type: string
 *                       nullable: true
 *                     resolutionType:
 *                       type: string
 *                       nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid dispute ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Dispute not found
 */
router.get(
  '/status/:disputeId',
  disputeMiddleware.validateTrackDisputeStatus,
  disputeMiddleware.checkManageDisputesPermission,
  disputeController.trackDisputeStatus
);

/**
 * @swagger
 * /admin/mtables/disputes/escalate/{disputeId}:
 *   put:
 *     summary: Escalate a dispute to higher authority
 *     description: Marks a dispute as in review for escalation to an admin.
 *     tags: [Disputes]
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
 *         description: Dispute escalated successfully
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
 *                     disputeId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     serviceId:
 *                       type: integer
 *                     escalatedTo:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid dispute ID or dispute already resolved
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Dispute not found
 */
router.put(
  '/escalate/:disputeId',
  disputeMiddleware.validateEscalateDisputes,
  disputeMiddleware.checkManageDisputesPermission,
  disputeController.escalateDisputes
);

module.exports = router;