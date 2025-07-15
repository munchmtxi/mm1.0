'use strict';

const express = require('express');
const router = express.Router();
const batchDeliveryController = require('@controllers/driver/munch/batchDeliveryController');
const batchDeliveryValidator = require('@validators/driver/munch/batchDeliveryValidator');
const batchDeliveryMiddleware = require('@middleware/driver/munch/batchDeliveryMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Batch Delivery
 *   description: Driver batch food delivery management operations
 */

/**
 * @swagger
 * /driver/munch/batch-deliveries:
 *   post:
 *     summary: Create a batch delivery
 *     tags: [Batch Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deliveryIds
 *             properties:
 *               deliveryIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 maxItems: 5
 *     responses:
 *       200:
 *         description: Batch delivery created successfully
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
 *         description: Batch limit exceeded or invalid deliveries
 *       403:
 *         description: Driver unavailable
 */
router.post(
  '/',
  validate(batchDeliveryValidator.createBatchDelivery),
  batchDeliveryMiddleware.checkDriverStatus,
  batchDeliveryController.createBatchDelivery
);

/**
 * @swagger
 * /driver/munch/batch-deliveries/{batchId}:
 *   get:
 *     summary: Get batch delivery details
 *     tags: [Batch Delivery]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Batch delivery details retrieved successfully
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
 *         description: Batch delivery not found
 */
router.get(
  '/:batchId',
  validate(batchDeliveryValidator.getBatchDeliveryDetails),
  batchDeliveryController.getBatchDeliveryDetails
);

/**
 * @swagger
 * /driver/munch/batch-deliveries/status:
 *   put:
 *     summary: Update batch delivery status
 *     tags: [Batch Delivery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - batchId
 *               - status
 *             properties:
 *               batchId:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: ['requested', 'accepted', 'picked_up', 'in_delivery', 'delivered', 'cancelled']
 *     responses:
 *       200:
 *         description: Batch delivery status updated successfully
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
  validate(batchDeliveryValidator.updateBatchDeliveryStatus),
  batchDeliveryMiddleware.checkDriverStatus,
  batchDeliveryController.updateBatchDeliveryStatus
);

/**
 * @swagger
 * /driver/munch/batch-deliveries/{batchId}/optimize:
 *   post:
 *     summary: Optimize batch delivery route
 *     tags: [Batch Delivery]
 *     parameters:
 *       - in: path
 *         name: batchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Batch delivery route optimized successfully
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
 *         description: Batch delivery not found
 *       403:
 *         description: Unauthorized driver
 */
router.post(
  '/:batchId/optimize',
  validate(batchDeliveryValidator.optimizeBatchDeliveryRoute),
  batchDeliveryMiddleware.checkDriverStatus,
  batchDeliveryController.optimizeBatchDeliveryRoute
);

module.exports = router;