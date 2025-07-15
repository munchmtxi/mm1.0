'use strict';

const express = require('express');
const router = express.Router();
const {
  shareLocation,
  getLocation,
  configureMap,
} = require('@controllers/driver/location/locationController');
const {
  validateShareLocation,
  validateGetLocation,
  validateConfigureMap,
} = require('@middleware/driver/location/locationMiddleware');

/**
 * @swagger
 * /driver/location/share:
 *   post:
 *     summary: Share real-time driver location
 *     tags: [Driver Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - coordinates
 *             properties:
 *               coordinates:
 *                 type: object
 *                 required:
 *                   - lat
 *                   - lng
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *     responses:
 *       200:
 *         description: Location shared successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: null
 *       400:
 *         description: Invalid or missing coordinates, or driver not active
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/share', validateShareLocation, shareLocation);

/**
 * @swagger
 * /driver/location:
 *   get:
 *     summary: Retrieve driver's current location
 *     tags: [Driver Location]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Location retrieved successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     coordinates:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lng:
 *                           type: number
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Location data outdated
 *       404:
 *         description: Driver or location data not found
 *       500:
 *         description: Server error
 */
router.get('/', validateGetLocation, getLocation);

/**
 * @swagger
 * /driver/location/map:
 *   post:
 *     summary: Configure country-specific map provider
 *     tags: [Driver Location]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - country
 *             properties:
 *               country:
 *                 type: string
 *                 enum: [US, KE, PH, EU, CA, AU, UK, MW, TZ, MZ, NG, ZA, IN, BR]
 *     responses:
 *       200:
 *         description: Map configured successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                     zoomLevel:
 *                       type: integer
 *                     maxWaypoints:
 *                       type: integer
 *                     supportedCities:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Unsupported country
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/map', validateConfigureMap, configureMap);

module.exports = router;