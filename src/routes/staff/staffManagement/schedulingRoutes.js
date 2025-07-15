'use strict';

const express = require('express');
const router = express.Router();
const schedulingController = require('@controllers/staff/staffManagement/schedulingController');
const schedulingValidator = require('@validators/staff/staffManagement/schedulingValidator');
const schedulingMiddleware = require('@middleware/staff/staffManagement/schedulingMiddleware');

/**
 * @swagger
 * /staff/scheduling/shift:
 *   post:
 *     summary: Create a new shift schedule
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - schedule
 *             properties:
 *               restaurantId:
 *                 type: integer
 *                 description: The ID of the restaurant branch
 *               schedule:
 *                 type: object
 *                 required:
 *                   - staffId
 *                   - startTime
 *                   - endTime
 *                   - shiftType
 *                 properties:
 *                   staffId:
 *                     type: integer
 *                     description: The ID of the staff member
 *                   startTime:
 *                     type: string
 *                     format: date-time
 *                     description: Start time of the shift (ISO 8601)
 *                   endTime:
 *                     type: string
 *                     format: date-time
 *                     description: End time of the shift (ISO 8601)
 *                   shiftType:
 *                     type: string
 *                     enum: ['morning', 'afternoon', 'evening', 'night']
 *                     description: Type of shift
 *     responses:
 *       201:
 *         description: Shift created successfully
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
 *                     branch_id:
 *                       type: integer
 *                     start_time:
 *                       type: string
 *                       format: date-time
 *                     end_time:
 *                       type: string
 *                       format: date-time
 *                     shift_type:
 *                       type: string
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff or branch not found
 *       500:
 *         description: Server error
 */
router.post('/shift', schedulingMiddleware.checkStaffPermission, schedulingValidator.createShiftValidation, schedulingController.createShift);

/**
 * @swagger
 * /staff/scheduling/shift/{scheduleId}:
 *   put:
 *     summary: Update an existing shift
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the shift to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startTime:
 *                 type: string
 *                 format: date-time
 *                 description: New start time of the shift (optional)
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: New end time of the shift (optional)
 *               shiftType:
 *                 type: string
 *                 enum: ['morning', 'afternoon', 'evening', 'night']
 *                 description: New shift type (optional)
 *     responses:
 *       200:
 *         description: Shift updated successfully
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
 *                     branch_id:
 *                       type: integer
 *                     start_time:
 *                       type: string
 *                       format: date-time
 *                     end_time:
 *                       type: string
 *                       format: date-time
 *                     shift_type:
 *                       type: string
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Server error
 */
router.put('/shift/:scheduleId', schedulingMiddleware.checkStaffPermission, schedulingValidator.updateShiftValidation, schedulingController.updateShift);

/**
 * @swagger
 * /staff/scheduling/notify/{staffId}:
 *   post:
 *     summary: Notify staff of a shift change
 *     tags: [Scheduling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff to notify
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/notify/:staffId', schedulingMiddleware.checkStaffPermission, schedulingValidator.notifyShiftChangeValidation, schedulingController.notifyShiftChange);

module.exports = router;