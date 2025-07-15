'use strict';

const express = require('express');
const router = express.Router();
const sharedRideController = require('@controllers/driver/mtxi/sharedRideController');
const sharedRideValidator = require('@validators/driver/mtxi/sharedRideValidator');
const sharedRideMiddleware = require('@middleware/driver/mtxi/sharedRideMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Shared Ride
 *   description: Driver shared ride management operations
 */

/**
 * @swagger
 * /driver/mtxi/shared-rides/passenger/add:
 *   post:
 *     summary: Add passenger to shared ride
 *     tags: [Shared Ride]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - passengerId
 *             properties:
 *               rideId:
 *                 type: integer
 *               passengerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Passenger added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       404:
 *         description: Ride or customer not found
 *       403:
 *         description: Unauthorized driver
 */
router.post(
  '/passenger/add',
  validate(sharedRideValidator.addPassenger),
  sharedRideMiddleware.checkDriverStatus,
  sharedRideController.addPassenger
);

/**
 * @swagger
 * /driver/mtxi/shared-rides/passenger/remove:
 *   post:
 *     summary: Remove passenger from shared ride
 *     tags: [Shared Ride]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - passengerId
 *             properties:
 *               rideId:
 *                 type: integer
 *               passengerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Passenger removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Ride or customer not found
 *       403:
 *         description: Unauthorized driver
 */
router.post(
  '/passenger/remove',
  validate(sharedRideValidator.removePassenger),
  sharedRideMiddleware.checkDriverStatus,
  sharedRideController.removePassenger
);

/**
 * @swagger
 * /driver/mtxi/shared-rides/{rideId}:
 *   get:
 *     summary: Get shared ride details
 *     tags: [Shared Ride]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Shared ride details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Invalid shared ride
 */
router.get(
  '/:rideId',
  validate(sharedRideValidator.getSharedRideDetails),
  sharedRideController.getSharedRideDetails
);

/**
 * @swagger
 * /driver/mtxi/shared-rides/{rideId}/optimize:
 *   post:
 *     summary: Optimize shared ride route
 *     tags: [Shared Ride]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Route optimized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       404:
 *         description: Invalid shared ride
 *       403:
 *         description: Unauthorized driver
 */
router.post(
  '/:rideId/optimize',
  validate(sharedRideValidator.optimizeSharedRideRoute),
  sharedRideMiddleware.checkDriverStatus,
  sharedRideController.optimizeSharedRideRoute
);

module.exports = router;