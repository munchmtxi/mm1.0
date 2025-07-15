// messagingRoutes.js
// API routes for staff messaging operations.

'use strict';

const express = require('express');
const router = express.Router();
const messagingController = require('@controllers/staff/communication/messagingController');
const messagingMiddleware = require('@middleware/staff/communication/messagingMiddleware');

/**
 * @swagger
 * /staff/communication/message:
 *   post:
 *     summary: Send a direct message to a staff member
 *     tags: [Staff Communication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *               - receiverId
 *               - content
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Sender staff ID
 *               receiverId:
 *                 type: integer
 *                 description: Receiver staff ID
 *               content:
 *                 type: string
 *                 description: Message content
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     sender_id:
 *                       type: integer
 *                     receiver_id:
 *                       type: integer
 *                     content:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/message', messagingMiddleware.validateSendMessage, messagingController.sendMessage);

/**
 * @swagger
 * /staff/communication/announcement:
 *   post:
 *     summary: Broadcast an announcement to staff in a shift
 *     tags: [Staff Communication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduleId
 *               - content
 *             properties:
 *               scheduleId:
 *                 type: integer
 *                 description: Shift schedule ID
 *               content:
 *                 type: string
 *                 description: Announcement content
 *     responses:
 *       200:
 *         description: Announcement broadcast successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     chat_id:
 *                       type: integer
 *                     sender_id:
 *                       type: integer
 *                     content:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/announcement', messagingMiddleware.validateBroadcastAnnouncement, messagingController.broadcastAnnouncement);

/**
 * @swagger
 * /staff/communication/logs:
 *   post:
 *     summary: Retrieve communication logs for a staff member
 *     tags: [Staff Communication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - staffId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: Staff ID
 *     responses:
 *       200:
 *         description: Communication logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       messageId:
 *                         type: integer
 *                       chatId:
 *                         type: integer
 *                       content:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/logs', messagingMiddleware.validateLogCommunication, messagingController.logCommunication);

module.exports = router;