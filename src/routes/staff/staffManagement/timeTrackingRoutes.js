'use strict';

const express = require('express');
const router = express.Router();
const timeTrackingController = require('@controllers/staff/staffManagement/timeTrackingController');
const timeTrackingValidator = require('@validators/staff/staffManagement/timeTrackingValidator');
const timeTrackingMiddleware = require('@middleware/staff/staffManagement/timeTrackingMiddleware');

/**
 * @swagger
 * /staff/timetracking/clock:
 *   post:
 *     summary: Record staff clock-in or clock-out
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - action
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               action:
 *                 type: string
 *                 enum: ['clock_in', 'clock_out']
 *                 description: The clock-in or clock-out action
 *     responses:
 *       201:
 *         description: Clock-in/out recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     staff_id:
 *                       type: integer
 *                     action:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     clock_out_time:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or already clocked in/out
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/clock', timeTrackingMiddleware.checkTimeTrackingPermission, timeTrackingValidator.recordClockInOutValidation, timeTrackingController.recordClockInOut);

/**
 * @swagger
 * /staff/timetracking/duration/{staffId}:
 *   get:
 *     summary: Calculate total shift duration for a staff member
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Shift duration calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     staffId:
 *                       type: integer
 *                     totalHours:
 *                       type: number
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.get('/duration/:staffId', timeTrackingMiddleware.checkTimeTrackingPermission, timeTrackingValidator.calculateShiftDurationValidation, timeTrackingController.calculateShiftDuration);

/**
 * @swagger
 * /staff/timetracking/report/{staffId}:
 *   post:
 *     summary: Generate a time tracking report for a staff member
 *     tags: [TimeTracking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Time report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     report_type:
 *                       type: string
 *                     data:
 *                       type: string
 *                     generated_by:
 *                       type: integer
 *                 message:
 *                   type: string
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/report/:staffId', timeTrackingMiddleware.checkTimeTrackingPermission, timeTrackingValidator.generateTimeReportValidation, timeTrackingController.generateTimeReport);

module.exports = router;