// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\merchant\staff\schedulingRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const schedulingController = require('@controllers/merchant/staff/schedulingController');
const schedulingValidator = require('@validators/merchant/staff/schedulingValidator');
const schedulingMiddleware = require('@middleware/merchant/staff/schedulingMiddleware');

/**
 * @swagger
 * /api/merchant/staff/scheduling/{restaurantId}/create:
 *   post:
 *     summary: Create a staff schedule
 *     tags: [Staff Scheduling]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the merchant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               staffId:
 *                 type: integer
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               shiftType:
 *                 type: string
 *                 enum: [morning, afternoon, evening, night]
 *     responses:
 *       200:
 *         description: Schedule created successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:restaurantId/create',
  schedulingValidator.createScheduleValidation,
  schedulingMiddleware.validateRequest,
  schedulingController.createSchedule,
);

/**
 * @swagger
 * /api/merchant/staff/scheduling/{staffId}/track:
 *   post:
 *     summary: Record clock-in or clock-out time
 *     tags: [Staff Scheduling]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shiftId:
 *                 type: integer
 *               clockIn:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               clockOut:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Time tracked successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/track',
  schedulingValidator.trackTimeValidation,
  schedulingMiddleware.validateRequest,
  schedulingController.trackTime,
);

/**
 * @swagger
 * /api/merchant/staff/scheduling/{staffId}/notify/{shiftId}:
 *   post:
 *     summary: Send a shift reminder
 *     tags: [Staff Scheduling]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the shift
 *     responses:
 *       200:
 *         description: Shift reminder sent successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/notify/:shiftId',
  schedulingValidator.notifyScheduleValidation,
  schedulingMiddleware.validateRequest,
  schedulingController.notifySchedule,
);

/**
 * @swagger
 * /api/merchant/staff/scheduling/{scheduleId}/adjust:
 *   patch:
 *     summary: Adjust an existing schedule
 *     tags: [Staff Scheduling]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the schedule
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
 *                 nullable: true
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *               shiftType:
 *                 type: string
 *                 enum: [morning, afternoon, evening, night]
 *                 nullable: true
 *               status:
 *                 type: string
 *                 enum: [scheduled, active, completed, cancelled]
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Schedule adjusted successfully
 *       400:
 *         description: Invalid request
 */
router.patch(
  '/:scheduleId/adjust',
  schedulingValidator.adjustScheduleValidation,
  schedulingMiddleware.validateRequest,
  schedulingController.adjustSchedule,
);

module.exports = router;