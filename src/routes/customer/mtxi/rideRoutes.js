'use strict';

const express = require('express');
const router = express.Router();
const rideController = require('@controllers/customer/mtxi/rideController');
const rideValidation = require('@validators/customer/mtxi/rideValidation');
const rideMiddleware = require('@middleware/customer/mtxi/rideMiddleware');

/**
 * Ride routes
 */
router.post(
  '/rides',
  rideMiddleware.validateLanguageCode,
  rideValidation.createRide,
  rideController.createRide
  /**
   * @swagger
   * /customer/mtxi/rides:
   *   post:
   *     summary: Create a new ride
   *     tags: [Ride]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               pickupLocation: { type: object }
   *               dropoffLocation: { type: object }
   *               rideType: { type: string, enum: ['standard', 'shared'] }
   *               scheduledTime: { type: string, format: date-time }
   *               friends: { type: array, items: { type: integer } }
   *               walletId: { type: integer }
   *     responses:
   *       201:
   *         description: Ride created
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object, properties: { rideId: { type: integer }, reference: { type: string } } }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.put(
  '/rides/status',
  rideMiddleware.validateLanguageCode,
  rideValidation.updateRideStatus,
  rideController.updateRideStatus
  /**
   * @swagger
   * /customer/mtxi/rides/status:
   *   put:
   *     summary: Update ride status
   *     tags: [Ride]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               rideId: { type: integer }
   *               status: { type: string, enum: ['COMPLETED', 'CANCELLED'] }
   *     responses:
   *       200:
   *         description: Status updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.post(
  '/rides/friends',
  rideMiddleware.validateLanguageCode,
  rideValidation.addFriendsToRide,
  rideController.addFriendsToRide
  /**
   * @swagger
   * /customer/mtxi/rides/friends:
   *   post:
   *     summary: Add friends to ride
   *     tags: [Ride]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               rideId: { type: integer }
   *               friends: { type: array, items: { type: integer } }
   *     responses:
   *       200:
   *         description: Friends added
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.post(
  '/rides/feedback',
  rideMiddleware.validateLanguageCode,
  rideValidation.submitFeedback,
  rideController.submitFeedback
  /**
   * @swagger
   * /customer/mtxi/rides/feedback:
   *   post:
   *     summary: Submit ride feedback
   *     tags: [Ride]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               rideId: { type: integer }
   *               rating: { type: integer, minimum: 1, maximum: 5 }
   *               comment: { type: string }
   *     responses:
   *       200:
   *         description: Feedback submitted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.get(
  '/rides/history',
  rideMiddleware.validateLanguageCode,
  rideController.getRideHistory
  /**
   * @swagger
   * /customer/mtxi/rides/history:
   *   get:
   *     summary: Get ride history
   *     tags: [Ride]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     responses:
   *       200:
   *         description: Ride history retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: array, items: { type: object } }
   *       403:
   *         description: Unauthorized
   */
);

module.exports = router;