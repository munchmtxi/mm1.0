// bookingRoutes.js
// API routes for staff mtables operations.

'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/staff/mtables/bookingController');
const bookingMiddleware = require('@middleware/staff/mtables/bookingMiddleware');

/**
 * @swagger
 * /staff/mtables/bookings:
 *   post:
 *     summary: Retrieve active bookings for a restaurant
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *     responses:
 *       200:
 *         description: Active bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       branch_id:
 *                         type: integer
 *                       status:
 *                         type: string
 *                       booking_date:
 *                         type: string
 *                       booking_time:
 *                         type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/bookings', bookingMiddleware.validateGetActiveBookings, bookingController.getActiveBookings);

/**
 * @swagger
 * /staff/mtables/status:
 *   post:
 *     summary: Update booking status
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - status
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               status:
 *                 type: string
 *                 description: New booking status
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     booking_modified_at:
 *                       type: string
 *                     booking_modified_by:
 *                       type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/status', bookingMiddleware.validateUpdateBookingStatus, bookingController.updateBookingStatus);

/**
 * @swagger
 * /staff/mtables/waitlist:
 *   post:
 *     summary: Manage waitlist for a restaurant
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - customerId
 *               - action
 *               - staffId
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: Merchant branch ID
 *               customerId:
 *                 type: integer
 *                 description: Customer ID
 *               action:
 *                 type: string
 *                 description: Waitlist action (add or remove)
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Waitlist managed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     waitlist_position:
 *                       type: integer
 *                     waitlisted_at:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/waitlist', bookingMiddleware.validateManageWaitlist, bookingController.manageWaitlist);

module.exports = router;