'use strict';

const express = require('express');
const router = express.Router();
const safetyController = require('@controllers/driver/safety/safetyController');
const safetyValidator = require('@validators/driver/safety/safetyValidator');
const safetyMiddleware = require('@middleware/driver/safety/safetyMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Safety
 *   description: Driver safety incident and alert management operations
 */

/**
 * @swagger
 * /driver/safety/incident:
 *   post:
 *     summary: Report a safety incident
 *     tags: [Driver Safety]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incident_type
 *             properties:
 *               incident_type:
 *                 type: string
 *                 enum: ['ACCIDENT', 'HARASSMENT', 'UNSAFE_SITUATION', 'VEHICLE_ISSUE', 'OTHER']
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               location:
 *                 type: object
 *                 properties:
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *               ride_id:
 *                 type: integer
 *               delivery_order_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Incident reported successfully
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
 *       400:
 *         description: Invalid incident type, description, or location
 *       404:
 *         description: Driver not found
 */
router.post(
  '/incident',
  validate(safetyValidator.reportIncident),
  safetyMiddleware.checkDriverExists,
  safetyController.reportIncident
);

/**
 * @swagger
 * /driver/safety/sos:
 *   post:
 *     summary: Trigger SOS alert
 *     tags: [Driver Safety]
 *     responses:
 *       200:
 *         description: SOS triggered successfully
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
 *         description: Driver not found
 */
router.post(
  '/sos',
  safetyMiddleware.checkDriverExists,
  safetyController.triggerSOS
);

/**
 * @swagger
 * /driver/safety/status:
 *   get:
 *     summary: Get safety status
 *     tags: [Driver Safety]
 *     responses:
 *       200:
 *         description: Safety status retrieved successfully
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
 *         description: Driver not found
 */
router.get(
  '/status',
  validate(safetyValidator.getSafetyStatus),
  safetyMiddleware.checkDriverExists,
  safetyController.getSafetyStatus
);

/**
 * @swagger
 * /driver/safety/discreet-alert:
 *   post:
 *     summary: Send discreet safety alert
 *     tags: [Driver Safety]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertType
 *             properties:
 *               alertType:
 *                 type: string
 *                 enum: ['UNSAFE_SITUATION', 'HARASSMENT']
 *     responses:
 *       200:
 *         description: Discreet alert sent successfully
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
 *       400:
 *         description: Invalid alert type
 *       404:
 *         description: Driver not found
 */
router.post(
  '/discreet-alert',
  validate(safetyValidator.sendDiscreetAlert),
  safetyMiddleware.checkDriverExists,
  safetyController.sendDiscreetAlert
);

module.exports = router;