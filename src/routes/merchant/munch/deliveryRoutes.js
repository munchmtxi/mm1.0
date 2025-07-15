'use strict';

const express = require('express');
const router = express.Router();
const {
  assignDeliveryAuth,
  trackDeliveryStatusAuth,
  communicateWithDriverAuth,
} = require('@middleware/merchant/munch/deliveryMiddleware');
const {
  validateAssignDelivery,
  validateTrackDeliveryStatus,
  validateCommunicateWithDriver,
} = require('@validators/merchant/munch/deliveryValidator');
const {
  assignDeliveryController,
  trackDeliveryStatusController,
  communicateWithDriverController,
} = require('@controllers/merchant/munch/deliveryController');

/**
 * @swagger
 * /merchant/munch/delivery/assign:
 *   post:
 *     summary: Assign a delivery task
 *     description: Assigns a delivery to a driver, updates order status, notifies the driver, and awards points if completed.
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - driverId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               driverId:
 *                 type: integer
 *                 description: Driver ID
 *                 example: 456
 *     responses:
 *       200:
 *         description: Delivery assigned
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
 *                   example: Delivery assigned for order ORD-123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     driverId:
 *                       type: integer
 *                       example: 456
 *                     status:
 *                       type: string
 *                       example: out_for_delivery
 *       400:
 *         description: Invalid input or status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order or driver not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/assign', assignDeliveryAuth, validateAssignDelivery, assignDeliveryController);

/**
 * @swagger
 * /merchant/munch/delivery/track:
 *   post:
 *     summary: Track delivery status
 *     description: Retrieves real-time delivery progress, including driver location and estimated delivery time.
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *     responses:
 *       200:
 *         description: Delivery status retrieved
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
 *                   example: Delivery status updated for order 123.
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     status:
 *                       type: string
 *                       example: out_for_delivery
 *                     driverId:
 *                       type: integer
 *                       example: 456
 *                     driverLocation:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         coordinates:
 *                           type: array
 *                           items:
 *                             type: number
 *                           example: [-74.0059, 40.7128]
 *                     estimatedDeliveryTime:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-06-05T12:30:00Z
 *                     actualDeliveryTime:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                       example: null
 *                     deliveryLocation:
 *                       type: object
 *                       properties:
 *                         city:
 *                           type: string
 *                           example: New York
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/track', trackDeliveryStatusAuth, validateTrackDeliveryStatus, trackDeliveryStatusController);

/**
 * @swagger
 * /merchant/munch/delivery/communicate:
 *   post:
 *     summary: Communicate with driver
 *     description: Sends a message to the driver assigned to an order and notifies via WhatsApp.
 *     tags: [Delivery]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - message
 *             properties:
 *               orderId:
 *                 type: integer
 *                 description: Order ID
 *                 example: 123
 *               message:
 *                 type: string
 *                 description: Message content
 *                 example: Please contact customer before delivery.
 *     responses:
 *       200:
 *         description: Message sent
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
 *                   example: Message for order ORD-123: Please contact customer before delivery.
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                       example: 123
 *                     driverId:
 *                       type: integer
 *                       example: 456
 *                     message:
 *                       type: string
 *                       example: Please contact customer before delivery.
 *       400:
 *         description: Invalid input or message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order or driver not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/communicate', communicateWithDriverAuth, validateCommunicateWithDriver, communicateWithDriverController);

module.exports = router;