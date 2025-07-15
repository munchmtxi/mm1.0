'use strict';

const express = require('express');
const router = express.Router();
const driverCommunicationController = require('@controllers/merchant/drivers/driverCommunicationController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const driverCommunicationValidator = require('@validators/merchant/drivers/driverCommunicationValidator');
const { restrictDriverCommunicationAccess } = require('@middleware/merchant/drivers/driverCommunicationMiddleware');

router.use(authenticate);
router.use(restrictDriverCommunicationAccess);

/**
 * @swagger
 * /merchant/drivers/{driverId}/message:
 *   post:
 *     summary: Send a message to a driver
 *     tags: [DriverCommunication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: driverId
 *         required: true
 *         schema:
 *           type: string
 *         description: Driver ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: string
 *                     notificationId:
 *                       type: string
 *                     logId:
 *                       type: string
 *                     taskId:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Driver not found
 */
router.post('/:driverId/message', restrictTo('merchant'), checkPermissions('manage_driver_communication'), driverCommunicationValidator.validateSendDriverMessage, driverCommunicationController.sendDriverMessage);

/**
 * @swagger
 * /merchant/drivers/{orderId}/delivery-update:
 *   post:
 *     summary: Broadcast delivery update for an order
 *     tags: [DriverCommunication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: Update message
 *     responses:
 *       200:
 *         description: Delivery update broadcast successfully
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
 *                     orderId:
 *                       type: string
 *                     driverId:
 *                       type: string
 *                     notificationId:
 *                       type: string
 *                     logId:
 *                       type: string
 *                     orderNumber:
 *                       type: string
 *                     taskId:
 *                       type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Order or driver not found
 */
router.post('/:orderId/delivery-update', restrictTo('merchant'), checkPermissions('manage_driver_communication'), driverCommunicationValidator.validateBroadcastDeliveryUpdates, driverCommunicationController.broadcastDeliveryUpdates);

/**
 * @swagger
 * /merchant/drivers/{merchantId}/channels:
 *   post:
 *     summary: Manage driver communication channels
 *     tags: [DriverCommunication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Driver channels updated successfully
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
 *                     merchantId:
 *                       type: string
 *                     driverCount:
 *                       type: integer
 *                     taskCount:
 *                       type: integer
 *                     driverIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     taskIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     points:
 *                       type: integer
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Merchant not found
 */
router.post('/:merchantId/channels', restrictTo('merchant'), checkPermissions('manage_driver_communication'), driverCommunicationValidator.validateManageDriverChannels, driverCommunicationController.manageDriverChannels);

module.exports = router;