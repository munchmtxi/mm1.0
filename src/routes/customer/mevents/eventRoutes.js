'use strict';

const express = require('express');
const router = express.Router();
const eventController = require('@controllers/customer/mevents/eventController');
const eventMiddleware = require('@middleware/customer/mevents/eventMiddleware');
const eventValidator = require('@validators/customer/mevents/eventValidator');

/**
 * @swagger
 * /api/customer/mevents:
 *   post:
 *     summary: Create a new event
 *     description: Creates an event with optional participants, menu items, and tables, sends notifications, logs audit, emits socket event, and awards gamification points.
 *     tags:
 *       - Customer Events
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - occasion
 *               - paymentType
 *             properties:
 *               title:
 *                 type: string
 *                 description: Event title
 *                 example: Birthday Party
 *               description:
 *                 type: string
 *                 description: Event description
 *                 example: Celebration at restaurant
 *               occasion:
 *                 type: string
 *                 enum: [birthday, anniversary, other]
 *                 description: Event type
 *                 example: birthday
 *               paymentType:
 *                 type: string
 *                 enum: [solo, split]
 *                 description: Payment method
 *                 example: solo
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Participant user IDs
 *                 example: [456, 567]
 *               selectedMenuItems:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Menu item IDs
 *                 example: [101, 102]
 *               selectedTables:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Table IDs
 *                 example: [201, 202]
 *     responses:
 *       201:
 *         description: Event created successfully
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
 *                   example: Event created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
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
 *         description: Invalid request parameters or creation failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer, participant, menu item, or table not found
 *       429:
 *         description: Max participants exceeded
 *
 * /api/customer/mevents/bookingservices:
 *   post:
 *     summary: Manage group bookings for an event
 *     description: Adds services (bookings, orders, rides, in-dining orders, parking bookings) to an event, processes payments, sends notifications, logs audit, emits socket event, and awards gamification points.
 *     tags:
 *       - Customer Events
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - services
 *             properties:
 *               eventId:
 *                 type: integer
 *                 description: ID of the event
 *                 example: 123
 *               services:
 *                 type: object
 *                 properties:
 *                   bookings:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [789]
 *                   orders:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [101]
 *                   rides:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [202]
 *                   inDiningOrders:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [303]
 *                   parkingBookings:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [404]
 *     responses:
 *       200:
 *         description: Transaction processed successfully
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
 *                   example: Transaction processed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: integer
 *                       example: 123
 *                     serviceCount:
 *                       type: integer
 *                       example: 4
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or booking failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event or service not found
 *       429:
 *         description: Max services exceeded
 *
 * /api/customer/mevents/groupchat:
 *   post:
 *     summary: Facilitate group chat for an event
 *     description: Sets up a group chat, sends notifications, logs audit, emits socket event, and awards gamification points.
 *     tags:
 *       - Customer Events
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *               - participantIds
 *             properties:
 *               eventId:
 *                 type: integer
 *                 description: ID of the event
 *                 example: 123
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Participant user IDs
 *                 example: [456, 567]
 *     responses:
 *       200:
 *         description: Group chat enabled successfully
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
 *                   example: Group chat enabled successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: integer
 *                       example: 123
 *                     chatRoom:
 *                       type: string
 *                       example: event:chat:123
 *                     gamificationError:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         message:
 *                           type: string
 *                           example: Failed to award points
 *       400:
 *         description: Invalid request parameters or chat failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event or participant not found
 *
 * /api/customer/mevents/{eventId}:
 *   patch:
 *     summary: Amend an existing event
 *     description: Updates an event's details, participants, menu items, tables, or services, processes payments, sends notifications, logs audit, emits socket event, and awards gamification points.
 *     tags:
 *       - Customer Events
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the event to amend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated event title
 *                 example: Updated Birthday Party
 *               description:
 *                 type: string
 *                 description: Updated event description
 *                 example: Updated celebration details
 *               occasion:
 *                 type: string
 *                 enum: [birthday, anniversary, other]
 *                 description: Updated event type
 *                 example: anniversary
 *               paymentType:
 *                 type: string
 *                 enum: [solo, split]
 *                 description: Updated payment method
 *                 example: split
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Updated participant user IDs
 *                 example: [456, 567, 789]
 *               selectedMenuItems:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Updated menu item IDs
 *                 example: [103, 104]
 *               selectedTables:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Updated table IDs
 *                 example: [203, 204]
 *               services:
 *                 type: object
 *                 properties:
 *                   bookings:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [789]
 *                   orders:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [101]
 *                   rides:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [202]
 *                   inDiningOrders:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [303]
 *                   parkingBookings:
 *                     type: array
 *                     items:
 *                       type: integer
 *                     example: [404]
 *     responses:
 *       200:
 *         description: Event amended successfully
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
 *                   example: Event amended successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
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
 *         description: Invalid request parameters or amendment failure
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Event, participant, menu item, table, or service not found
 *       429:
 *         description: Max participants or services exceeded
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

router.post(
  '/',
  eventMiddleware.authenticate,
  eventMiddleware.restrictTo('customer'),
  eventMiddleware.checkPermissions('create_event'),
  eventValidator.validateCreateEvent,
  eventController.createEvent
);

router.post(
  '/bookingservices',
  eventMiddleware.authenticate,
  eventMiddleware.restrictTo('customer'),
  eventMiddleware.checkPermissions('manage_event'),
  eventValidator.validateManageGroupBookings,
  eventMiddleware.validateEventAccess,
  eventController.manageGroupBookings
);

router.post(
  '/groupchat',
  eventMiddleware.authenticate,
  eventMiddleware.restrictTo('customer'),
  eventMiddleware.checkPermissions('manage_chat'),
  eventValidator.validateFacilitateGroupChat,
  eventMiddleware.validateEventAccess,
  eventMiddleware.validateParticipantAccess,
  eventController.facilitateGroupChat
);

router.patch(
  '/:eventId',
  eventMiddleware.authenticate,
  eventMiddleware.restrictTo('customer'),
  eventMiddleware.checkPermissions('manage_event'),
  eventValidator.validateAmendEvent,
  eventMiddleware.validateEventAccess,
  eventController.amendEvent
);

module.exports = router;