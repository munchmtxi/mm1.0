'use strict';

const express = require('express');
const router = express.Router();
const notificationController = require('@controllers/merchant/crm/notificationController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const notificationValidator = require('@validators/merchant/crm/notificationValidator');
const { restrictCRMAccess } = require('@middleware/merchant/crm/customerSegmentationMiddleware');

router.use(authenticate);
router.use(restrictTo('merchant'));
router.use(checkPermissions('manage_notifications'));

/**
 * @swagger
 * /merchant/crm/notifications/customer/{customerId}:
 *   post:
 *     summary: Send an alert to a customer
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [order_update, booking_update]
 *                   content:
 *                     type: string
 *                   orderId:
 *                     type: string
 *                   bookingId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Alert sent successfully
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
 *                     customerId:
 *                       type: string
 *                     notificationId:
 *                       type: string
 *                     messageType:
 *                       type: string
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Customer not found
 */
router.post('/notifications/customer/:customerId', notificationValidator.validateSendCustomerAlert, notificationController.sendCustomerAlert);

/**
 * @swagger
 * /merchant/crm/notifications/staff/{staffId}:
 *   post:
 *     summary: Send a notification to a staff member
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: string
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [task_assignment, schedule_update]
 *                   content:
 *                     type: string
 *                   taskId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
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
 *                     staffId:
 *                       type: string
 *                     notificationId:
 *                       type: string
 *                     messageType:
 *                       type: string
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Staff not found
 */
router.post('/notifications/staff/:staffId', notificationValidator.validateSendStaffNotifications, notificationController.sendStaffNotifications);

/**
 * @swagger
 * /merchant/crm/notifications/driver/{driverId}:
 *   post:
 *     summary: Send an alert to a driver
 *     tags: [Notifications]
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
 * content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [delivery_assignment, delivery_update]
 *                   content:
 *                     type: string
 *                   orderId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully
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
 *                     messageType:
 *                       type: string
 *                     points:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Driver not found
 */
router.post('/notifications/driver/:driverId', notificationValidator.validateSendDriverNotification, notificationController.sendDriverNotification);

module.exports = router;