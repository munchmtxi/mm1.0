'use strict';

const express = require('express');
const deliveryController = require('@controllers/customer/munch/deliveryController');
const deliveryValidation = require('@validators/customer/munch/deliveryValidation');
const validate = require('@middleware/validate');
const deliveryMiddleware = require('@middleware/customer/munch/deliveryMiddleware');

const router = express.Router();

/**
 * Delivery Routes
 * Defines endpoints for delivery operations.
 */
router.get(
  '/:orderId/track',
  validate(deliveryValidation.trackDelivery),
  deliveryMiddleware.checkOrderExists,
  deliveryController.trackDelivery
  /**
   * @swagger
   * /delivery/{orderId}/track:
   *   get:
   *     summary: Track a delivery order
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order to track
   *     responses:
   *       200:
   *         description: Order tracked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

router.post(
  '/:orderId/cancel',
  validate(deliveryValidation.cancelDelivery),
  deliveryMiddleware.checkOrderExists,
  deliveryMiddleware.checkOrderCancellable,
  deliveryController.cancelDelivery
  /**
   * @swagger
   * /delivery/{orderId}/cancel:
   *   post:
   *     summary: Cancel a delivery order
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order to cancel
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason: { type: string, minLength: 5, maxLength: 500 }
   *     responses:
   *       200:
   *         description: Order cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

router.post(
  '/:orderId/communicate',
  validate(deliveryValidation.communicateWithDriver),
  deliveryMiddleware.checkOrderExists,
  deliveryController.communicateWithDriver
  /**
   * @swagger
   * /delivery/{orderId}/communicate:
   *   post:
   *     summary: Send a message to the driver
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               message: { type: string, minLength: 1, maxLength: 1000 }
   *     responses:
   *       200:
   *         description: Message sent successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

router.post(
  '/:orderId/feedback',
  validate(deliveryValidation.requestFeedback),
  deliveryMiddleware.checkOrderExists,
  deliveryMiddleware.checkOrderCompleted,
  deliveryController.requestFeedback
  /**
   * @swagger
   * /delivery/{orderId}/feedback:
   *   post:
   *     summary: Request feedback for a completed delivery
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order
   *     responses:
   *       200:
   *         description: Feedback requested successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

router.patch(
  '/:orderId/status',
  validate(deliveryValidation.updateDeliveryStatus),
  deliveryMiddleware.checkOrderExists,
  deliveryMiddleware.checkDriverAssignment,
  deliveryController.updateDeliveryStatus
  /**
   * @swagger
   * /delivery/{orderId}/status:
   *   patch:
   *     summary: Update delivery status (driver only)
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status: { type: string, enum: ['pending', 'in_progress', 'delivered', 'cancelled'] }
   *     responses:
   *       200:
   *         description: Status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

router.post(
  '/:orderId/earnings',
  validate(deliveryValidation.processDriverEarnings),
  deliveryMiddleware.checkOrderExists,
  deliveryMiddleware.checkDriverAssignment,
  deliveryMiddleware.checkOrderCompleted,
  deliveryController.processDriverEarnings
  /**
   * @swagger
   * /delivery/{orderId}/earnings:
   *   post:
   *     summary: Process driver earnings (driver only)
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order
   *     responses:
   *       200:
   *         description: Earnings processed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

router.patch(
  '/location',
  validate(deliveryValidation.updateDriverLocation),
  deliveryController.updateDriverLocation
  /**
   * @swagger
   * /delivery/location:
   *   patch:
   *     summary: Update driver location (driver only)
   *     tags: [Delivery]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               coordinates:
   *                 type: object
   *                 properties:
   *                   latitude: { type: number, minimum: -90, maximum: 90 }
   *                   longitude: { type: number, minimum: -180, maximum: 180 }
   *               countryCode: { type: string }
   *     responses:
   *       200:
   *         description: Location updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   */
);

router.get(
  '/address-predictions',
  validate(deliveryValidation.getAddressPredictions),
  deliveryController.getAddressPredictions
  /**
   * @swagger
   * /delivery/address-predictions:
   *   get:
   *     summary: Retrieve address predictions for delivery location
   *     tags: [Delivery]
   *     parameters:
   *       - in: query
   *         name: input
   *         required: true
   *         schema:
   *           type: string
   *         description: Address input for predictions
   *       - in: query
   *         name: countryCode
   *         schema:
   *           type: string
   *         description: Country code (default: US)
   *     responses:
   *       200:
   *         description: Address predictions retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: array }
   *       403:
   *         description: Permission denied
   */
);

router.patch(
  '/:orderId/location',
  validate(deliveryValidation.updateDeliveryLocation),
  deliveryMiddleware.checkOrderExists,
  deliveryController.updateDeliveryLocation
  /**
   * @swagger
   * /delivery/{orderId}/location:
   *   patch:
   *     summary: Update delivery location for an order
   *     tags: [Delivery]
   *     parameters:
   *       - in: path
   *         name: orderId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: The ID of the order
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               placeId: { type: string }
   *               countryCode: { type: string }
   *     responses:
   *       200:
   *         description: Location updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 message: { type: string }
   *                 data: { type: object }
   *       403:
   *         description: Permission denied
   *       404:
   *         description: Order not found
   */
);

module.exports = router;