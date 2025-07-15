// payoutRoutes.js
// API routes for merchant payout operations.

'use strict';

const express = require('express');
const router = express.Router();
const payoutController = require('@controllers/merchant/wallet/payoutController');
const payoutMiddleware = require('@middleware/merchant/wallet/payoutMiddleware');

/**
 * @swagger
 * /merchant/wallet/payout/settings:
 *   post:
 *     summary: Configure payout settings for a merchant
 *     tags: [Merchant Payout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - settings
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               settings:
 *                 type: object
 *                 required:
 *                   - schedule
 *                   - method
 *                 properties:
 *                   schedule:
 *                     type: string
 *                     description: Payout schedule
 *                     enum: [daily, weekly, monthly]
 *                   method:
 *                     type: string
 *                     description: Payout method
 *                     enum: [bank_transfer, mobile_money]
 *                   account_details:
 *                     type: object
 *                     description: Account details for payout
 *     responses:
 *       200:
 *         description: Payout settings configured successfully
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
 *                     user_id:
 *                       type: integer
 *                     merchant_id:
 *                       type: integer
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     bank_details:
 *                       type: object
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/settings', payoutMiddleware.validateConfigurePayoutSettings, payoutController.configurePayoutSettings);

/**
 * @swagger
 * /merchant/wallet/payout/process:
 *   post:
 *     summary: Process a payout to a recipient
 *     tags: [Merchant Payout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - recipientId
 *               - amount
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               recipientId:
 *                 type: integer
 *                 description: The ID of the recipient (staff)
 *               amount:
 *                 type: number
 *                 description: The payout amount
 *     responses:
 *       200:
 *         description: Payout processed successfully
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
 *                     wallet_id:
 *                       type: integer
 *                     type:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     status:
 *                       type: string
 *                     description:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/process', payoutMiddleware.validateProcessPayout, payoutController.processPayout);

/**
 * @swagger
 * /merchant/wallet/payout/verify:
 *   post:
 *     summary: Verify a payout method for a recipient
 *     tags: [Merchant Payout]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - method
 *             properties:
 *               recipientId:
 *                 type: integer
 *                 description: The ID of the recipient (staff)
 *               method:
 *                 type: object
 *                 required:
 *                   - type
 *                   - accountDetails
 *                 properties:
 *                   type:
 *                     type: string
 *                     description: Payout method
 *                     enum: [bank_transfer, mobile_money]
 *                   accountDetails:
 *                     type: object
 *                     required:
 *                       - accountNumber
 *                       - bankCode
 *                     properties:
 *                       accountNumber:
 *                         type: string
 *                       bankCode:
 *                         type: string
 *     responses:
 *       200:
 *         description: Payout method verified successfully
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
 *                     verified:
 *                       type: boolean
 *                     method:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/verify', payoutMiddleware.validateVerifyPayoutMethod, payoutController.verifyPayoutMethod);

/**
 * @swagger
 * /merchant/wallet/payout/history:
 *   get:
 *     summary: Retrieve payout history for a merchant
 *     tags: [Merchant Payout]
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the merchant
 *     responses:
 *       200:
 *         description: Payout history retrieved successfully
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
 *                       id:
 *                         type: integer
 *                       wallet_id:
 *                         type: integer
 *                       type:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       status:
 *                         type: string
 *                       description:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/history', payoutMiddleware.validateGetPayoutHistory, payoutController.getPayoutHistory);

module.exports = router;