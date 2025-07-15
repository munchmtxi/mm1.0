'use strict';

const express = require('express');
const router = express.Router();
const walletController = require('@controllers/customer/wallet/walletController');
const walletValidator = require('@validators/customer/wallet/walletValidator');
const validate = require('@middleware/common/validateMiddleware');
const walletMiddleware = require('@middleware/customer/wallet/walletMiddleware');

/**
 * @swagger
 * tags:
 *   name: Customer Wallet
 *   description: Customer wallet management endpoints
 */

/**
 * @swagger
 * /customer/wallet:
 *   post:
 *     summary: Create a new wallet
 *     tags: [Customer Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               languageCode:
 *                 type: string
 *                 example: en
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { type: object }
 *       400:
 *         description: Bad request
 *       404:
 *         description: Customer not found
 */
router.post('/', validate(walletValidator.createWallet), walletController.createWallet);

/**
 * @swagger
 * /customer/wallet/add-funds:
 *   post:
 *     summary: Add funds to wallet
 *     tags: [Customer Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               amount:
 *                 type: number
 *                 example: 50.00
 *               paymentMethod:
 *                 type: object
 *                 properties:
 *                   type: { type: string, example: CREDIT_CARD }
 *                   id: { type: string, example: pm_123456 }
 *               languageCode:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Funds added successfully
 *       400:
 *         description: Invalid amount or payment method
 *       404:
 *         description: Wallet not found
 */
router.post('/add-funds', validate(walletValidator.addFunds), walletMiddleware.verifyPaymentMethod, walletController.addFunds);

/**
 * @swagger
 * /customer/wallet/withdraw-funds:
 *   post:
 *     summary: Withdraw funds from wallet
 *     tags: [Customer Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               amount:
 *                 type: number
 *                 example: 50.00
 *               destination:
 *                 type: object
 *                 properties:
 *                   accountNumber: { type: string, example: 1234567890 }
 *                   bankName: { type: string, example: Bank of America }
 *                   id: { type: string, example: dest_123456 }
 *               languageCode:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Funds withdrawn successfully
 *       400:
 *         description: Invalid amount or insufficient funds
 *       404:
 *         description: Wallet not found
 */
router.post('/withdraw-funds', validate(walletValidator.withdrawFunds), walletMiddleware.verifyDestination, walletController.withdrawFunds);

/**
 * @swagger
 * /customer/wallet/pay:
 *   post:
 *     summary: Pay with wallet
 *     tags: [Customer Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               serviceId:
 *                 type: string
 *                 example: svc_123456
 *               amount:
 *                 type: number
 *                 example: 25.00
 *               languageCode:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *       400:
 *         description: Invalid amount or insufficient funds
 *       404:
 *         description: Wallet not found
 */
router.post('/pay', validate(walletValidator.payWithWallet), walletMiddleware.verifyService, walletController.payWithWallet);

/**
 * @swagger
 * /customer/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Customer Wallet]
 *     parameters:
 *       - in: query
 *         name: walletId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *         example: en
 *     responses:
 *       200:
 *         description: Balance retrieved successfully
 *       404:
 *         description: Wallet not found
 */
router.get('/balance', validate(walletValidator.getWalletBalance), walletController.getWalletBalance);

/**
 * @swagger
 * /customer/wallet/transactions:
 *   get:
 *     summary: Get wallet transactions
 *     tags: [Customer Wallet]
 *     parameters:
 *       - in: query
 *         name: walletId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         example: 123e4567-e89b-12d3-a456-426614174000
 *       - in: query
 *         name: languageCode
 *         schema:
 *           type: string
 *         example: en
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *       404:
 *         description: Wallet not found
 */
router.get('/transactions', validate(walletValidator.getWalletTransactions), walletController.getWalletTransactions);

/**
 * @swagger
 * /customer/wallet/reward:
 *   post:
 *     summary: Credit wallet for reward
 *     tags: [Customer Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               amount:
 *                 type: number
 *                 example: 10.00
 *               rewardId:
 *                 type: string
 *                 example: reward_123456
 *               description:
 *                 type: string
 *                 example: Loyalty reward
 *               languageCode:
 *                 type: string
 *                 example: en
 *     responses:
 *       200:
 *         description: Reward credited successfully
 *       400:
 *         description: Invalid amount or currency mismatch
 *       404:
 *         description: Wallet not found
 */
router.post('/reward', validate(walletValidator.creditWalletForReward), walletMiddleware.verifyReward, walletController.creditWalletForReward);

module.exports = router;