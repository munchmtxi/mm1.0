'use strict';

const express = require('express');
const router = express.Router();
const rideController = require('@controllers/driver/mtxi/rideController');
const rideValidator = require('@validators/driver/mtxi/rideValidator');
const rideMiddleware = require('@middleware/driver/mtxi/rideMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Ride
 *   description: Driver ride management operations
 */

/**
 * @swagger
 * /driver/mtxi/rides/{rideId}/accept:
 *   post:
 *     summary: Accept a ride request
 *     tags: [Ride]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ride accepted successfully
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
 *         description: Ride not found
 *       400:
 *         description: Driver unavailable or ride cannot be accepted
 */
router.post(
  '/:rideId/accept',
  validate(rideValidator.acceptRide),
  rideMiddleware.checkDriverStatus,
  rideController.acceptRide
);

/**
 * @swagger
 * /driver/mtxi/rides/{rideId}:
 *   get:
 *     summary: Get ride details
 *     tags: [Ride]
 *     parameters:
 *       - in: path
 *         name: rideId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ride details retrieved successfully
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
 *         description: Ride not found
 */
router.get(
  '/:rideId',
  validate(rideValidator.getRideDetails),
  rideController.getRideDetails
);

/**
 * @swagger
 * /driver/mtxi/rides/status:
 *   put:
 *     summary: Update ride status
 *     tags: [Ride]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - status
 *             properties:
 *               rideId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled']
 *     responses:
 *       200:
 *         description: Ride status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Unauthorized driver
 */
router.put(
  '/status',
  validate(rideValidator.updateRideStatus),
  rideMiddleware.checkDriverStatus,
  rideController.updateRideStatus
);

/**
 * @swagger
 * /driver/mtxi/rides/message:
 *   post:
 *     summary: Send message to passenger
 *     tags: [Ride]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rideId
 *               - message
 *             properties:
 *               rideId:
 *                 type: integer
 *               message:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 Giorgio
 *                   type: string
 *       404:
 *         description: Ride not found
 *       403:
 *         description: Unauthorized driver
 */
router.post(
  '/message',
  validate(rideValidator.communicateWithPassenger),
  rideMiddleware.checkDriverStatus,
  rideController.communicateWithPassenger
);

module.exports = router;