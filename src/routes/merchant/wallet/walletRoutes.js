// walletRoutes.js
// API routes for merchant wallet operations.

'use strict';

const express = require('express');
const router = express.Router();
const walletController = require('@controllers/merchant/wallet/walletController');
const walletMiddleware = require('@middleware/merchant/wallet/walletMiddleware');

/**
 * @swagger
 * /merchant/wallet/create:
 *   post:
 *     summary: Create a merchant wallet
 *     tags: [Merchant Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *     responses:
 *       201:
 *         description: Wallet created successfully
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
 *                     type:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/create', walletMiddleware.validateCreateWallet, walletController.createWallet);

/**
 * @swagger
 * /merchant/wallet/payment:
 *   post:
 *     summary: Process a customer payment to merchant wallet
 *     tags: [Merchant Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - amount
 *               - walletId
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               amount:
 *                 type: number
 *                 description: The payment amount
 *               walletId:
 *                 type: integer
 *                 description: The ID of the customer wallet
 *     responses:
 *       200:
 *         description: Payment processed successfully
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
router.post('/payment', walletMiddleware.validateProcessPayment, walletController.processPayment);

/**
 * @swagger
 * /merchant/wallet/payout:
 *   post:
 *     summary: Disburse a payout to staff
 *     tags: [Merchant Wallet]
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
 *                 description: The ID of the staff recipient
 *               amount:
 *                 type: number
 *                 description: The payout amount
 *     responses:
 *       200:
 *         description: Payout disbursed successfully
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
router.post('/payout', walletMiddleware.validateProcessPayout, walletController.processPayout);

/**
 * @swagger
 * /merchant/wallet/balance:
 *   get:
 *     summary: Retrieve merchant wallet balance
 *     tags: [Merchant Wallet]
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the merchant
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
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
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/balance', walletMiddleware.validateGetBalance, walletController.getBalance);

/**
 * @swagger
 * /merchant/wallet/history:
 *   get:
 *     summary: Retrieve transaction history
 *     tags: [Merchant Wallet]
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the merchant
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
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
router.get('/history', walletMiddleware.validateGetHistory, walletController.getHistory);

module.exports = router;