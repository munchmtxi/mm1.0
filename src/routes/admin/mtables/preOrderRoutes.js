'use strict';

const express = require('express');
const router = express.Router();
const preOrderController = require('@controllers/admin/mtables/preOrderController');
const preOrderMiddleware = require('@middleware/admin/mtables/preOrderMiddleware');
const mtablesConstants = require('@constants/admin/mtablesConstants');

/**
 * @swagger
 * /admin/mtables/preorders/monitor:
 *   post:
 *     summary: Monitor pre-order details
 *     description: Retrieves and monitors pre-order details for a booking.
 *     tags: [PreOrders]
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
 *             required: [bookingId]
 *     responses:
 *       200:
 *         description: Pre-order details retrieved successfully
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
 *                     customerId:
 *                       type: integer
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalAmount:
 *                       type: number
 *                     status:
 *                       type: string
 *                     dietaryFilters:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid booking ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking or pre-order not found
 */
router.post(
  '/monitor',
  preOrderMiddleware.validateMonitorPreOrders,
  preOrderMiddleware.checkManagePreOrdersPermission,
  preOrderController.monitorPreOrders
);

/**
 * @swagger
 * /admin/mtables/preorders/invitations:
 *   post:
 *     summary: Manage friend invitations
 *     description: Sends invitations to friends for a booking.
 *     tags: [PreOrders]
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
 *               invitation:
 *                 type: object
 *                 properties:
 *                   friendIds:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     description: IDs of friends to invite
 *                   message:
 *                     type: string
 *                     description: Optional invitation message
 *                 required: [friendIds]
 *             required: [bookingId, invitation]
 *     responses:
 *       200:
 *         description: Invitations sent successfully
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
 *                     invitedFriends:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid booking ID, friend IDs, or group size exceeded
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking not found
 */
router.post(
  '/invitations',
  preOrderMiddleware.validateManageFriendInvitations,
  preOrderMiddleware.checkManagePreOrdersPermission,
  preOrderController.manageFriendInvitations
);

/**
 * @swagger
 * /admin/mtables/preorders/payments:
 *   post:
 *     summary: Process party payments
 *     description: Processes group payments for a booking's pre-order.
 *     tags: [PreOrders]
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
 *               paymentDetails:
 *                 type: object
 *                 properties:
 *                   splits:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         customerId:
 *                           type: integer
 *                           description: ID of the customer
 *                         amount:
 *                           type: number
 *                           description: Payment amount
 *                         walletId:
 *                           type: integer
 *                           description: ID of the wallet
 *                       required: [customerId, amount, walletId]
 *                 required: [splits]
 *             required: [bookingId, paymentDetails]
 *     responses:
 *       200:
 *         description: Party payments processed successfully
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
 *         description: Invalid payment splits or amount mismatch
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking, order, or customer not found
 */
router.post(
  '/payments',
  preOrderMiddleware.validateProcessPartyPayments,
  preOrderMiddleware.checkManagePreOrdersPermission,
  preOrderController.processPartyPayments
);

module.exports = router;