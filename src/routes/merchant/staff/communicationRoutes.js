// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\routes\merchant\staff\communicationRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const communicationController = require('@controllers/merchant/staff/communicationController');
const communicationValidator = require('@validators/merchant/staff/communicationValidator');
const communicationMiddleware = require('@middleware/merchant/staff/communicationMiddleware');

/**
 * @swagger
 * /api/merchant/staff/communication/{staffId}/message:
 *   post:
 *     summary: Send a message to a staff member
 *     tags: [Staff Communication]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member to receive the message
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               senderId:
 *                 type: integer
 *               content:
 *                 type: string
 *               channelId:
 *                 type: integer
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:staffId/message',
  communicationValidator.sendMessageValidation,
  communicationMiddleware.validateRequest,
  communicationController.sendMessage,
);

/**
 * @swagger
 * /api/merchant/staff/communication/{scheduleId}/announce:
 *   post:
 *     summary: Broadcast shift announcement
 *     tags: [Staff Communication]
 *     parameters:
 *       - in: path
 *         name: scheduleId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the shift to announce
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shift announced successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:scheduleId/announce',
  communicationValidator.announceShiftValidation,
  communicationMiddleware.validateRequest,
  communicationController.announceShift,
);

/**
 * @swagger
 * /api/merchant/staff/communication/{restaurantId}/channels:
 *   post:
 *     summary: Manage communication channels
 *     tags: [Staff Communication]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the restaurant branch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [team, shift, manager]
 *     responses:
 *       200:
 *         description: Channel created successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  '/:restaurantId/channels',
  communicationValidator.manageChannelsValidation,
  communicationMiddleware.validateRequest,
  communicationController.manageChannels,
);

/**
 * @swagger
 * /api/merchant/staff/communication/{staffId}/track:
 *   get:
 *     summary: Track staff communications
 *     tags: [Staff Communication]
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the staff member to track
 *     responses:
 *       200:
 *         description: Communication history retrieved
 *       400:
 *         description: Invalid request
 */
router.get(
  '/:staffId/track',
  communicationValidator.trackCommunicationValidation,
  communicationMiddleware.validateRequest,
  communicationController.trackCommunication,
);

module.exports = router;