'use strict';

const express = require('express');
const router = express.Router();
const {
  createShift,
  getShiftDetails,
  updateShift,
  notifyHighDemand,
} = require('@controllers/driver/scheduling/schedulingController');
const {
  validateCreateShift,
  validateGetShiftDetails,
  validateUpdateShift,
  validateNotifyHighDemand,
} = require('@middleware/driver/scheduling/schedulingMiddleware');

/**
 * @swagger
 * /driver/scheduling/create:
 *   post:
 *     summary: Create a new driver shift
 *     tags: [Driver Scheduling]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - start_time
 *               - end_time
 *               - shift_type
 *             properties:
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-10T09:00:00Z
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-10T17:00:00Z
 *               shift_type:
 *                 type: string
 *                 enum: [standard, batch]
 *     responses:
 *       200:
 *         description: Shift created successfully
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
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     driver_id:
 *                       type: number
 *                     start_time:
 *                       type: string
 *                     end_time:
 *                       type: string
 *                     shift_type:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/create', validateCreateShift, createShift);

/**
 * @swagger
 * /driver/scheduling:
 *   get:
 *     summary: Retrieve driver shift details
 *     tags: [Driver Scheduling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Shift details retrieved successfully
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
 *                   example: Driver registered
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shiftId:
 *                         type: number
 *                       start_time:
 *                         type: string
 *                       end_time:
 *                         type: string
 *                       shift_type:
 *                         type: string
 *                       status:
 *                         type: string
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/', validateGetShiftDetails, getShiftDetails);

/**
 * @swagger
 * /driver/scheduling/{shiftId}:
 *   patch:
 *     summary: Update or cancel a driver shift
 *     tags: [Driver Scheduling]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shiftId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               shift_type:
 *                 type: string
 *                 enum: [standard, batch]
 *               status:
 *                 type: string
 *                 enum: [scheduled, active, completed, cancelled]
 *     responses:
 *       200:
 *         description: Shift updated successfully
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
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     shiftId:
 *                       type: number
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Shift or driver not found
 *       500:
 *         description: Server error
 */
router.patch('/:shiftId', validateUpdateShift, updateShift);

/**
 * @swagger
 * /driver/scheduling/high-demand:
 *   post:
 *     summary: Notify driver of high-demand areas
 *     tags: [Driver Scheduling]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: High-demand notification sent successfully
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
 *                   example: Driver registered
 *                 data:
 *                   type: null
 *       404:
 *         description: Driver or high-demand areas not found
 *       500:
 *         description: Server error
 */
router.post('/high-demand', validateNotifyHighDemand, notifyHighDemand);

module.exports = router;