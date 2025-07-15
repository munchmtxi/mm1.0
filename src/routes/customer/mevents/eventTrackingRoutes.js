'use strict';

const express = require('express');
const router = express.Router();
const eventTrackingController = require('@controllers/customer/mevents/eventTrackingController');
const eventTrackingMiddleware = require('@middleware/customer/mevents/eventTrackingMiddleware');
const eventTrackingValidator = require('@validators/customer/mevents/eventTrackingValidator');

/**
 * @swagger
 * /api/customer/mevents/tracking/interactions:
 *   post:
 *     summary: Track user interactions
 *     description: Tracks a customer interaction with an event or service, sends notifications, logs audit, emits socket event, and awards gamification points automatically.
 *     tags:
 *       - Customer Event Tracking
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interactionType
 *             properties:
 *               eventId:
 *                 type: integer
 *                 description: ID of the event
 *                 example: 123
 *               interactionType:
 *                 type: string
 *                 enum: [booking_added, order_added, ride_added, in_dining_order_added, parking_booking_added, menu_item_selected, table_selected, event_updated]
 *                 description: Type of interaction
 *                 example: booking_added
 *               metadata:
 *                 type: object
 *                 description: Additional interaction details
 *                 oneOf:
 *                   - properties:
 *                       inDiningOrderId:
 *                         type: integer
 *                         description: In-dining order ID
 *                         example: 456
 *                     required: [inDiningOrderId]
 *                   - properties:
 *                       parkingBookingId:
 *                         type: integer
 *                         description: Parking booking ID
 *                         example: 789
 *                     required: [parkingBookingId]
 *                   - properties:
 *                       menuItemId:
 *                         type: integer
 *                         description: Menu item ID
 *                         example: 101
 *                     required: [menuItemId]
 *                   - properties:
 *                       tableId:
 *                         type: integer
 *                         description: Table ID
 *                         example: 202
 *                     required: [tableId]
 *                   - properties:
 *                       eventId:
 *                         type: integer
 *                         description: Event ID for amendment
 *                         example: 123
 *                     required: [eventId]
 *     responses:
 *       201:
 *         description: Interaction tracked successfully
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
 *                   example: Interaction tracked successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     trackingId:
 *                       type: integer
 *                       example: 123
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or tracking failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer, event, or service not found
 *       429:
 *         description: Daily interaction limit exceeded
 *
 * /api/customer/mevents/tracking/engagement/{customerId}:
 *   get:
 *     summary: Analyze customer engagement
 *     description: Analyzes customer engagement over a period, awards points for high engagement, sends notifications, and logs audit.
 *     tags:
 *       - Customer Event Tracking
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the customer
 *         example: 456
 *     responses:
 *       200:
 *         description: Engagement analyzed successfully
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
 *                   example: Engagement analyzed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       properties:
 *                         totalInteractions:
 *                           type: integer
 *                           example: 25
 *                         interactionTypes:
 *                           type: object
 *                           example: { booking_added: 10, order_added: 5, parking_booking_added: 3, menu_item_selected: 4, table_selected: 2, event_updated: 1 }
 *                         eventCount:
 *                           type: integer
 *                           example: 3
 *                         occasions:
 *                           type: object
 *                           example: { birthday: 2, other: 1 }
 *                         services:
 *                           type: object
 *                           example: { mtables: 10, munch: 5, mtxi: 5, in_dining: 5, mpark: 3 }
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or analysis failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/interactions',
  eventTrackingMiddleware.authenticate,
  eventTrackingMiddleware.restrictTo('customer'),
  eventTrackingMiddleware.checkPermissions('track_interaction'),
  eventTrackingValidator.validateTrackUserInteractions,
  eventTrackingMiddleware.validateEventAccess,
  eventTrackingController.trackUserInteractions
);

router.get(
  '/engagement/:customerId',
  eventTrackingMiddleware.authenticate,
  eventTrackingMiddleware.restrictTo('customer'),
  eventTrackingMiddleware.checkPermissions('analyze_engagement'),
  eventTrackingMiddleware.validateCustomerAccess,
  eventTrackingController.analyzeEngagement
);

module.exports = router;