'use strict';

const express = require('express');
const router = express.Router();
const driverController = require('@controllers/customer/mtxi/driverController');
const driverValidation = require('@validators/customer/mtxi/driverValidation');
const driverMiddleware = require('@middleware/customer/mtxi/driverMiddleware');

/**
 * Driver routes
 */
router.get(
  '/drivers/:rideId',
  driverMiddleware.validateLanguageCode,
  driverValidation.trackDriver,
  driverController.trackDriver
  /**
   * @swagger
   * /customer/mtxi/drivers/{rideId}:
   *   get:
   *     summary: Track driver location
   *     tags: [Driver]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *       - in: path
   *         name: rideId
   *         schema:
   *           type: integer
   *         required: true
   *         description: Ride ID
   *     responses:
   *       200:
   *         description: Driver location retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.put(
  '/drivers/location',
  driverMiddleware.validateLanguageCode,
  driverValidation.updateDriverLocation,
  driverController.updateDriverLocation
  /**
   * @swagger
   * /customer/mtxi/drivers/location:
   *   put:
   *     summary: Update driver location
   *     tags: [Driver]
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
   *               coordinates: { type: object }
   *               countryCode: { type: string }
   *     responses:
   *       200:
   *         description: Location updated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Unauthorized
   */
);

router.get(
  '/drivers/nearby',
  driverMiddleware.validateLanguageCode,
  driverController.getNearbyDrivers
  /**
   * @swagger
   * /customer/mtxi/drivers/nearby:
   *   get:
   *     summary: Get nearby drivers
   *     tags: [Driver]
   *     parameters:
   *       - in: header
   *         name: accept-language
   *         schema:
   *           type: string
   *         description: Language code (e.g., en)
   *     responses:
   *       200:
   *         description: Nearby drivers retrieved
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