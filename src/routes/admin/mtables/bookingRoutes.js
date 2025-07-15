'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/admin/mtables/bookingController');
const bookingMiddleware = require('@middleware/admin/mtables/bookingMiddleware');
const mtablesConstants = require('@constants/admin/mtablesConstants');

/**
 * @swagger
 * /admin/mtables/bookings/monitor/{restaurantId}:
 *   get:
 *     summary: Monitor real-time booking statuses for a restaurant
 *     description: Retrieves a summary of active bookings and upcoming blackout dates for a specified restaurant.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     responses:
 *       200:
 *         description: Booking status summary retrieved successfully
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
 *                     totalActiveBookings:
 *                       type: integer
 *                     byStatus:
 *                       type: object
 *                       additionalProperties:
 *                         type: integer
 *                     upcomingBlackouts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date-time
 *                           reason:
 *                             type: string
 *                           timeRange:
 *                             type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid restaurant ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Restaurant not found
 */
router.get(
  '/monitor/:restaurantId',
  bookingMiddleware.validateMonitorBookings,
  bookingMiddleware.checkTableMonitorPermission,
  bookingController.monitorBookings
);

/**
 * @swagger
 * /admin/mtables/bookings/adjust/{bookingId}:
 *   put:
 *     summary: Reassign a table for a booking
 *     description: Updates the table assignment for a booking with an optional reason for reassignment.
 *     tags: [Bookings]
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
 *               tableId:
 *                 type: integer
 *                 description: ID of the new table
 *               reason:
 *                 type: string
 *                 description: Reason for reassignment (optional)
 *             required:
 *               - tableId
 *     responses:
 *       200:
 *         description: Table reassigned successfully
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
 *                     tableNumber:
 *                       type: string
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid booking ID, table ID, or table not available
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking not found
 */
router.put(
  '/adjust/:bookingId',
  bookingMiddleware.validateManageTableAdjustments,
  bookingMiddleware.checkTableAssignPermission,
  bookingController.manageTableAdjustments
);

/**
 * @swagger
 * /admin/mtables/bookings/close/{bookingId}:
 *   put:
 *     summary: Finalize a booking
 *     description: Marks a booking as completed, updates table status, and closes associated in-dining orders.
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the booking
 *     responses:
 *       200:
 *         description: Booking finalized successfully
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
 *                     status:
 *                       type: string
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid booking ID or booking already completed
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Booking not found
 */
router.put(
  '/close/:bookingId',
  bookingMiddleware.validateCloseBookings,
  bookingMiddleware.checkTableAssignPermission,
  bookingController.closeBookings
);

module.exports = router;