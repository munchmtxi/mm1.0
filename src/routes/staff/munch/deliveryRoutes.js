// deliveryRoutes.js
// API routes for staff munch delivery operations.

'use strict';

const express = require('express');
const router = express.Router();
const deliveryController = require('@controllers/staff/munch/deliveryController');
const deliveryMiddleware = require('@middleware/staff/munch/deliveryMiddleware');

/**
 * @swagger
 * /staff/munch/assign-driver:
 *   post:
 *     summary: Assign a driver to an order
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Driver assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     order_number:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/assign-driver', deliveryMiddleware.validateAssignDriver, deliveryController.assignDriver);

/**
 * @swagger
 * /staff/munch/prepare-package:
 *   post:
 *     summary: Prepare delivery package
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - staffId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Delivery package prepared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     order_number:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/prepare-package', deliveryMiddleware.validatePrepareDeliveryPackage, deliveryController.prepareDeliveryPackage);

/**
 * @swagger
 * /staff/munch/track-driver/{orderId}:
 *   get:
 *     summary: Track driver status
 *     tags: [Staff Munch]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Driver status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     lastUpdated:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/track-driver/:orderId', deliveryMiddleware.validateTrackDriverStatus, deliveryController.trackDriverStatus);

module.exports = router;