// checkInRoutes.js
// API routes for staff mtables check-in operations.

'use strict';

const express = require('express');
const router = express.Router();
const checkInController = require('@controllers/staff/mtables/checkInController');
const checkInMiddleware = require('@middleware/staff/mtables/checkInMiddleware');

/**
 * @swagger
 * /staff/mtables/checkin:
 *   post:
 *     summary: Process customer check-in
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Check-in processed successfully
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
 *                     table_id:
 *                       type: integer
 *                     arrived_at:
 *                       type: string
 *                     seated_at:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/checkin', checkInMiddleware.validateProcessCheckIn, checkInController.processCheckIn);

/**
 * @swagger
 * /staff/mtables/checkin-time:
 *   post:
 *     summary: Log check-in time for gamification
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - staffId
 *             properties:
 *               bookingId:
 *                 type: integer
 *                 description: Booking ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Check-in time logged successfully
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
 *                   type: null
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/checkin-time', checkInMiddleware.validateLogCheckInTime, checkInController.logCheckInTime);

/**
 * @swagger
 * /staff/mtables/table-status:
 *   post:
 *     summary: Update table availability status
 *     tags: [Staff mTables]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tableId
 *               - status
 *               - staffId
 *             properties:
 *               tableId:
 *                 type: integer
 *                 description: Table ID
 *               status:
 *                 type: string
 *                 description: New table status
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Table status updated successfully
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
 *                     tableId:
 *                       type: integer
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/table-status', checkInMiddleware.validateUpdateTableStatus, checkInController.updateTableStatus);

module.exports = router;