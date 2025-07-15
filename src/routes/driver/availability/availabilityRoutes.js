'use strict';

const express = require('express');
const router = express.Router();
const {
  setAvailability,
  getAvailability,
  toggleAvailability,
} = require('@controllers/driver/availability/availabilityController');
const {
  validateSetAvailability,
  validateGetAvailability,
  validateToggleAvailability,
} = require('@middleware/driver/availability/availabilityMiddleware');

/**
 * @swagger
 * /driver/availability/set:
 *   post:
 *     summary: Set driver availability hours
 *     tags: [Driver Availability]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *               - start_time
 *               - end_time
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2025-06-10
 *               start_time:
 *                 type: string
 *                 pattern: ^([01]\d|2[0-3]):([0-5]\d)$
 *                 example: 09:00
 *               end_time:
 *                 type: string
 *                 pattern: ^([01]\d|2[0-3]):([0-5]\d)$
 *                 example: 17:00
 *     responses:
 *       200:
 *         description: Availability set successfully
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
 *                     driver_id:
 *                       type: number
 *                     date:
 *                       type: string
 *                     start_time:
 *                       type: string
 *                     end_time:
 *                       type: string
 *                     status:
 *                       type: string
 *                     isOnline:
 *                       type: boolean
 *                     lastUpdated:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/set', validateSetAvailability, setAvailability);

/**
 * @swagger
 * /driver/availability:
 *   get:
 *     summary: Retrieve driver availability status
 *     tags: [Driver Availability]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Availability retrieved successfully
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
 *                     driverId:
 *                       type: number
 *                     availabilityStatus:
 *                       type: string
 *                     currentAvailability:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         date:
 *                           type: string
 *                         start_time:
 *                           type: string
 *                         end_time:
 *                           type: string
 *                         status:
 *                           type: string
 *                         isOnline:
 *                           type: boolean
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/', validateGetAvailability, getAvailability);

/**
 * @swagger
 * /driver/availability/toggle:
 *   post:
 *     summary: Toggle driver availability status
 *     tags: [Driver Availability]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isAvailable
 *             properties:
 *               isAvailable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Availability toggled successfully
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
 *                     isAvailable:
 *                       type: boolean
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/toggle', validateToggleAvailability, toggleAvailability);

module.exports = router;