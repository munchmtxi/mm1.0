'use strict';

const express = require('express');
const router = express.Router();
const eventManagementController = require('@controllers/merchant/mevents/eventManagementController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const eventManagementValidator = require('@validators/merchant/mevents/eventManagementValidator');
const { restrictEventAccess } = require('@middleware/merchant/mevents/eventManagementMiddleware');

router.use(authenticate);
router.use(restrictEventAccess);

/**
 * @swagger
 * /merchant/mevents/{eventId}/create:
 *   post:
 *     summary: Create a new event
 *     tags: [EventManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               merchantId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               occasion:
 *                 type: string
 *                 enum: [birthday, anniversary, corporate, social]
 *               paymentType:
 *                 type: string
 *                 enum: [solo, split]
 *               participantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     participantCount:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:eventId/create', restrictTo('merchant'), checkPermissions('manage_events'), eventManagementValidator.validateCreateEvent, eventManagementController.createEvent);

/**
 * @swagger
 * /merchant/mevents/{eventId}/bookings:
 *   post:
 *     summary: Manage group bookings for an event
 *     tags: [EventManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               orders:
 *                 type: array
 *                 items:
 *                   type: string
 *               mtablesBookings:
 *                 type: array
 *                 items:
 *                   type: string
 *               rides:
 *                 type: array
 *                 items:
 *                   type: string
 *               inDiningOrders:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Group bookings managed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: string
 *                     serviceCount:
 *                       type: integer
 *                     totalAmount:
 *                       type: number
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input or services
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/bookings', restrictTo('merchant'), checkPermissions('manage_events'), eventManagementValidator.validateManageGroupBookings, eventManagementController.manageGroupBookings);

/**
 * @swagger
 * /merchant/mevents/{eventId}/chat:
 *   post:
 *     summary: Facilitate group chat for an event
 *     tags: [EventManagement]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Group chat facilitated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     eventId:
 *                       type: string
 *                     chatRoom:
 *                       type: string
 *                     participantCount:
 *                       type: integer
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid participants
 *       404:
 *         description: Event not found
 */
router.post('/:eventId/chat', restrictTo('merchant'), checkPermissions('manage_events'), eventManagementValidator.validateFacilitateGroupChat, eventManagementController.facilitateGroupChat);

module.exports = router;