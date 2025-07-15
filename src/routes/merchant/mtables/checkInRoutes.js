'use strict';

const express = require('express');
const router = express.Router();
const checkInController = require('@controllers/merchant/mtables/checkInController');
const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const checkInValidator = require('@validators/merchant/mtables/checkInValidator');
const { restrictCheckInAccess } = require('@middleware/merchant/mtables/checkInMiddleware');

router.use(authenticate);
router.use(restrictCheckInAccess);

/**
 * @swagger
 * /merchant/mtables/checkin/{bookingId}/process:
 *   post:
 *     summary: Process a check-in (QR code or manual)
 *     tags: [MtablesCheckIn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [qr_code, manual]
 *               qrCode:
 *                 type: string
 *               coordinates:
 *                 type: object
 *                 properties:
 *                   lat: number
 *                   lng: number
 *     responses:
 *       200:
 *         description: Check-in processed successfully
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
 *                     bookingId: string
 *                     tableId: string
 *                     branchId: any
 *                     points: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Booking not found
 */
router.post('/checkin/:bookingId/process', restrictTo('customer'), checkPermissions('manage_checkins'), checkInValidator.validateProcessCheckIn, checkInController.processCheckIn);

/**
 * @swagger
 * /merchant/mtables/checkin/{tableId}/status:
 *   post:
 *     summary: Update table status
 *     tags: [MtablesCheckIn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableId
 *         required: true
 *         schema:
 *           type: string
 *         description: Table ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, reserved, occupied, maintenance]
 *     responses:
 *       200:
 *         description: Table status updated successfully
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
 *                     tableId: string
 *                     status: string
 *                     branchId: any
 *                     points: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Table not found
 */
router.post('/checkin/:tableId/status', restrictTo('merchant'), checkPermissions('manage_tables'), checkInValidator.validateUpdateTableStatus, checkInController.updateTableStatus);

/**
 * @swagger
 * /merchant/mtables/checkin/{bookingId}/log:
 *   post:
 *     summary: Log check-in time for gamification
 *     tags: [MtablesCheckIn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Check-in time logged successfully
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
 *                     bookingId: string
 *                     points: number
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Booking not found
 */
router.post('/checkin/:bookingId/log', restrictTo('customer'), checkPermissions('manage_checkins'), checkInValidator.validateLogCheckInTime, checkInController.logCheckInTime);

/**
 * @swagger
 * /merchant/mtables/checkin/{bookingId}/support:
 *   post:
 *     summary: Handle a support request during check-in
 *     tags: [MtablesCheckIn]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [booking, order, payment, table]
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Support request processed successfully
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
 *                     bookingId: string
 *                     type: string
 *                     points: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Booking not found
 */
router.post('/checkin/:bookingId/support', restrictTo('customer'), checkPermissions('manage_support'), checkInValidator.validateHandleSupportRequest, checkInController.handleSupportRequest);

module.exports = router;