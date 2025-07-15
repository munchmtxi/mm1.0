'use strict';

const express = require('express');
const router = express.Router();
const driverController = require('@controllers/admin/mtxi/driverController');
const driverMiddleware = require('@middleware/admin/mtxi/driverMiddleware');

/**
 * @swagger
 * tags:
 *   name: Driver Management
 *   description: Admin driver management for mtxi ride-sharing service
 */

/**
 * @swagger
 * /admin/mtxi/driver/assignment/{driverId}:
 *   post:
 *     summary: Assign a ride to a driver
 *     tags: [Driver Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rideId:
 *                 type: integer
 *                 description: ID of the ride to assign
 *             required:
 *               - rideId
 *     responses:
 *       200:
 *         description: Ride assigned successfully
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
 *                   example: Ride assigned successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     rideId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                       example: assigned
 *       400:
 *         description: Invalid driver ID or ride ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver or ride not found
 */
router.post(
  '/assignment/:driverId',
  driverMiddleware.checkDriverManagementPermission,
  driverMiddleware.validateManageDriverAssignment,
  driverController.manageDriverAssignment
);

/**
 * @swagger
 * /admin/mtxi/driver/availability/{driverId}:
 *   get:
 *     summary: Monitor driver availability
 *     tags: [Driver Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     responses:
 *       200:
 *         description: Driver availability retrieved successfully
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
 *                   example: Driver availability retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     availabilityStatus:
 *                       type: string
 *                     currentSchedule:
 *                       type: object
 *                       nullable: true
 *                     upcomingSchedules:
 *                       type: array
 *                       items:
 *                         type: object
 *       400:
 *         description: Invalid driver ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver not found
 */
router.get(
  '/availability/:driverId',
  driverMiddleware.checkDriverManagementPermission,
  driverMiddleware.validateMonitorDriverAvailability,
  driverController.monitorDriverAvailability
);

/**
 * @swagger
 * /admin/mtxi/driver/safety/{driverId}:
 *   get:
 *     summary: Review driver safety incidents
 *     tags: [Driver Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     responses:
 *       200:
 *         description: Safety incidents retrieved successfully
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
 *                   example: Safety incidents retrieved
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     totalIncidents:
 *                       type: integer
 *                     incidentsByType:
 *                       type: object
 *                     pendingIncidents:
 *                       type: integer
 *                     details:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           incident_type:
 *                             type: string
 *                           description:
 *                             type: string
 *                           status:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid driver ID
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver not found
 */
router.get(
  '/safety/:driverId',
  driverMiddleware.checkDriverManagementPermission,
  driverMiddleware.validateOverseeSafetyReports,
  driverController.overseeSafetyReports
);

/**
 * @swagger
 * /admin/mtxi/driver/training/{driverId}:
 *   post:
 *     summary: Administer driver training
 *     tags: [Driver Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the driver
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               module:
 *                 type: string
 *                 enum: [platform_usage, safety_protocols, customer_interaction, delivery_handling]
 *                 description: Training module
 *               action:
 *                 type: string
 *                 enum: [assign, complete, verify]
 *                 description: Training action
 *             required:
 *               - module
 *               - action
 *     responses:
 *       200:
 *         description: Training administered successfully
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
 *                   example: Training assigned successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     module:
 *                       type: string
 *                     action:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid driver ID, module, or action
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Driver not found
 */
router.post(
  '/training/:driverId',
  driverMiddleware.checkDriverManagementPermission,
  driverMiddleware.validateAdministerTraining,
  driverController.administerTraining
);

module.exports = router;