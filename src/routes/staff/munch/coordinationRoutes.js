// coordinationRoutes.js
// API routes for staff munch coordination operations.

'use strict';

const express = require('express');
const router = express.Router();
const coordinationController = require('@controllers/staff/munch/coordinationController');
const coordinationMiddleware = require('@middleware/staff/munch/coordinationMiddleware');

/**
 * @swagger
 * /staff/munch/coordinate-pickup:
 *   post:
 *     summary: Arrange driver pickups
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
 *         description: Driver pickup coordinated successfully
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
router.post('/coordinate-pickup', coordinationMiddleware.validateCoordinateDriverPickup, coordinationController.coordinateDriverPickup);

/**
 * @swagger
 * /staff/munch/verify-credentials:
 *   post:
 *     summary: Confirm driver identity
 *     tags: [Staff Munch]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *               - staffId
 *             properties:
 *               driverId:
 *                 type: integer
 *                 description: Driver ID
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Driver credentials verified successfully
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
 *                     status:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/verify-credentials', coordinationMiddleware.validateVerifyDriverCredentials, coordinationController.verifyDriverCredentials);

/**
 * @swagger
 * /staff/munch/log-pickup-time:
 *   post:
 *     summary: Record pickup time
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
 *         description: Pickup time logged successfully
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
 *                     clock_in:
 *                       type: string
 *                     duration:
 *                       type: number
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/log-pickup-time', coordinationMiddleware.validateLogPickupTime, coordinationController.logPickupTime);

module.exports = router;