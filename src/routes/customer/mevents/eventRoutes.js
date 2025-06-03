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
 *     description: Creates an event with optional participants, sends notifications, logs audit, emits socket event, and awards gamification points automatically.
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
 *         description: Customer or participant not found
 *       429:
 *         description: Max participants exceeded

/**
 * @swagger
 * /api/customer/mevents/bookingservices:
 *   post:
 *     summary: Manage group bookings for an event
 *     description: Adds services to an event, processes payments, sends notifications, logs audit, emits socket event, and awards gamification points.
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

/**
 * @swagger
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

module.exports = router;