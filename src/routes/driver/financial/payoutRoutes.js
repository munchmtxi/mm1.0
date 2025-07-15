'use strict';

const express = require('express');
const router = express.Router();
const {
  requestPayout,
  getPayoutHistory,
  verifyPayoutMethod,
  scheduleRecurringPayout,
} = require('@controllers/driver/financial/payoutController');
const {
  validateRequestPayout,
  validateGetPayoutHistory,
  validateVerifyPayoutMethod,
  validateScheduleRecurringPayout,
} = require('@middleware/driver/financial/payoutMiddleware');

/**
 * @swagger
 * /driver/financial/payout/request:
 *   post:
 *     summary: Request a driver payout
 *     tags: [Driver Payout]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 10
 *                 maximum: 5000
 *               method:
 *                 type: string
 *                 enum: [bank_transfer, wallet_transfer, mobile_money]
 *     responses:
 *       200:
 *         description: Payout requested successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     driver_id:
 *                       type: integer
 *                     wallet_id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     method:
 *                       type: string
 *                     status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid payout method or amount
 *       404:
 *         description: Driver or wallet not found
 *       429:
 *         description: Withdrawal attempts exceeded
 *       500:
 *         description: Server error
 */
router.post('/request', validateRequestPayout, requestPayout);

/**
 * @swagger
 * /driver/financial/payout/history:
 *   get:
 *     summary: Retrieve driver payout history
 *     tags: [Driver Payout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payout history retrieved successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       payoutId:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       method:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/history', validateGetPayoutHistory, getPayoutHistory);

/**
 * @swagger
 * /driver/financial/payout/verify:
 *   post:
 *     summary: Verify driver payout method
 *     tags: [Driver Payout]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [bank_transfer, wallet_transfer, mobile_money]
 *     responses:
 *       200:
 *         description: Payout method verified successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: object
 *                   properties:
 *                     isVerified:
 *                       type: boolean
 *       400:
 *         description: Invalid payout method
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/verify', validateVerifyPayoutMethod, verifyPayoutMethod);

/**
 * @swagger
 * /driver/financial/payout/schedule:
 *   post:
 *     summary: Schedule recurring driver payouts
 *     tags: [Driver Payout]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - frequency
 *               - amount
 *               - method
 *             properties:
 *               frequency:
 *                 type: string
 *                 enum: [weekly, biweekly, monthly]
 *               amount:
 *                 type: number
 *                 minimum: 10
 *                 maximum: 5000
 *               method:
 *                 type: string
 *                 enum: [bank_transfer, wallet_transfer, mobile_money]
 *     responses:
 *       200:
 *         description: Recurring payout scheduled successfully
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
 *                   example: Driver action completed
 *                 data:
 *                   type: null
 *       400:
 *         description: Invalid frequency, amount, or method
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.post('/schedule', validateScheduleRecurringPayout, scheduleRecurringPayout);

module.exports = router;