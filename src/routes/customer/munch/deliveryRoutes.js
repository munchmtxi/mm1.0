'use strict';

const express = require('express');
const router = express.Router();
const deliveryController = require('@controllers/customer/munch/deliveryController');
const deliveryValidator = require('@validators/customer/munch/deliveryValidator');
const deliveryMiddleware = require('@middleware/customer/munch/deliveryMiddleware');
const { validate } = require('@middleware/validate');

/**
 * @swagger
 * /api/customer/munch/delivery/{orderId}/status:
 *   get:
 *     summary: Track delivery status
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     estimatedDeliveryTime:
 *                       type: string
 *                     driver:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         location:
 *                           type: array
 *                           items:
 *                             type: number
 *                     deliveryLocation:
 *                       type: object
 *                     lastUpdated:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order not found
 */
/**
 * @swagger
 * /api/customer/munch/delivery/cancel:
 *   put:
 *     summary: Cancel a delivery
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Delivery cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                     status:
 *                       type: string
 *                     refundProcessed:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order not found
 */
/**
 * @swagger
 * /api/customer/munch/delivery/communicate:
 *   post:
 *     summary: Communicate with driver
 *     tags: [Munch]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orderId:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent to driver
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     orderId:
 *                       type: integer
 *                     message:
 *                       type: string
 *                     sentAt:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Order not found
 */

router.get('/:orderId/status', deliveryMiddleware.trackDeliveryStatus, validate(deliveryValidator.trackDeliveryStatusSchema), deliveryController.trackDeliveryStatus);
router.put('/cancel', deliveryMiddleware.cancelDelivery, validate(deliveryValidator.cancelDeliverySchema), deliveryController.cancelDelivery);
router.post('/communicate', deliveryMiddleware.communicateWithDriver, validate(deliveryValidator.communicateWithDriverSchema), deliveryController.communicateWithDriver);

module.exports = router;