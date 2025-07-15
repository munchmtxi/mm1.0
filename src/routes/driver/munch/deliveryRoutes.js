'use strict';

const express = require('express');
const router = express.Router();
const deliveryController = require('@controllers/driver/munch/deliveryController');
const deliveryValidator = require('@validators/driver/munch/deliveryValidator');
const deliveryMiddleware = require('@middleware/driver/munch/deliveryMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Delivery
 *   description: Driver food delivery management operations
 */

/**
 * @swagger
 * /driver/munch/deliveries/{deliveryId}/accept:
 *   post:
 *     summary: Accept a delivery request
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delivery accepted successfully
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
 *         description: Delivery not found
 *       400:
 *         description: Delivery cannot be accepted or driver unavailable
 */
router.post(
  '/:deliveryId/accept',
  validate(deliveryValidator.acceptDelivery),
  deliveryMiddleware.checkDriverStatus,
  deliveryController.acceptDelivery
);

/**
 * @swagger
 * /driver/munch/deliveries/{deliveryId}:
 *   get:
 *     summary: Get delivery details
 *     tags: [Delivery]
 *     parameters:
 *       - in: path
 *         name: deliveryId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delivery details retrieved successfully
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
 *         description: Delivery not found
 */
router.get(
  '/:deliveryId',
  validate(deliveryValidator.getDeliveryDetails),
  deliveryController.getDeliveryDetails
);

/**
 * @swagger
 * /driver/munch/deliveries/status:
 *   put:
 *     summary: Update delivery status
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryId
 *               - status
 *             properties:
 *               deliveryId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled']
 *     responses:
 *       200:
 *         description: Delivery status updated successfully
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
  validate(deliveryValidator.updateDeliveryStatus),
  deliveryMiddleware.checkDriverStatus,
  deliveryController.updateDeliveryStatus
);

/**
 * @swagger
 * /driver/munch/deliveries/message:
 *   post:
 *     summary: Send message to customer
 *     tags: [Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryId
 *               - message
 *             properties:
 *               deliveryId:
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
 *                 message:
 *                   type: string
 *       404:
 *         description: Delivery not found
 *       403:
 *         description: Unauthorized driver
 */
router.post(
  '/message',
  validate(deliveryValidator.communicateWithCustomer),
  deliveryMiddleware.checkDriverStatus,
  deliveryController.communicateWithCustomer
);

module.exports = router;