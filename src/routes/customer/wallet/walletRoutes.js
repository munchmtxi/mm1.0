'use strict';

const express = require('express');
const router = express.Router();
const {
  createWalletAction,
  addFundsAction,
  withdrawFundsAction,
  payWithWalletAction,
  getWalletBalanceAction,
  getWalletTransactionsAction,
  creditWalletAction,
} = require('@controllers/customer/wallet/walletController');
const {
  createWalletSchema,
  addFundsSchema,
  withdrawFundsSchema,
  payWithWalletSchema,
  creditWalletSchema,
} = require('@validators/customer/wallet/walletValidator');
const {
  createWallet,
  addFunds,
  withdrawFunds,
  payWithWallet,
  getWalletBalance,
  getWalletTransactions,
  creditWallet,
} = require('@middleware/customer/wallet/walletMiddleware');
const { validate } = require('@middleware/common');

/**
 * @swagger
 * /api/v1/customer/wallet:
 *   post:
 *     summary: Create a customer wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *             properties:
 *               customerId: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Wallet created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "success" }
 *                 data: { type: object, properties: { id: { type: integer }, user_id: { type: integer }, type: { type: string }, currency: { type: string }, balance: { type: number } } }
 */
router.post('/', createWallet, validate(createWalletSchema), createWalletAction);

/**
 * @swagger
 * /api/v1/customer/wallet/add-funds:
 *   post:
 *     summary: Add funds to a wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletId
 *               - amount
 *               - paymentMethod
 *             properties:
 *               walletId: { type: integer, example: 1 }
 *               amount: { type: number, example: 100 }
 *               paymentMethod: { type: object, properties: { type: { type: string, example: "credit_card" }, id: { type: integer, example: 1 } } }
 *     responses:
 *       200:
 *         description: Funds added
 */
router.post('/add-funds', addFunds, validate(addFundsSchema), addFundsAction);

/**
 * @swagger
 * /api/v1/customer/wallet/withdraw-funds:
 *   post:
 *     summary: Withdraw funds from a wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletId
 *               - amount
 *               - destination
 *             properties:
 *               walletId: { type: integer, example: 1 }
 *               amount: { type: number, example: 50 }
 *               destination: { type: object, properties: { accountNumber: { type: string }, bankName: { type: string }, id: { type: integer } } }
 *     responses:
 *       200:
 *         description: Funds withdrawn
 */
router.post('/withdraw-funds', withdrawFunds, validate(withdrawFundsSchema), withdrawFundsAction);

/**
 * @swagger
 * /api/v1/customer/wallet/pay:
 *   post:
 *     summary: Pay with wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletId
 *               - serviceId
 *               - amount
 *             properties:
 *               walletId: { type: integer, example: 1 }
 *               serviceId: { type: integer, example: 1 }
 *               amount: { type: number, example: 20 }
 *     responses:
 *       200:
 *         description: Payment processed
 */
router.post('/pay', payWithWallet, validate(payWithWalletSchema), payWithWalletAction);

/**
 * @swagger
 * /api/v1/customer/wallet/{walletId}/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Balance retrieved
 */
router.get('/:walletId/balance', getWalletBalance, getWalletBalanceAction);

/**
 * @swagger
 * /api/v1/customer/wallet/{walletId}/transactions:
 *   get:
 *     summary: Get wallet transactions
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Wallet ID
 *     responses:
 *       200:
 *         description: Transactions retrieved
 */
router.get('/:walletId/transactions', getWalletTransactions, getWalletTransactionsAction);

/**
 * @swagger
 * /api/v1/customer/wallet/credit:
 *   post:
 *     summary: Credit wallet with gamification reward
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - amount
 *               - currency
 *               - transactionType
 *               - description
 *             properties:
 *               userId: { type: integer, example: 1 }
 *               amount: { type: number, example: 10 }
 *               currency: { type: string, example: "USD" }
 *               transactionType: { type: string, example: "cashback" }
 *               description: { type: string, example: "Loyalty reward" }
 *     responses:
 *       200:
 *         description: Wallet credited
 */
router.post('/credit', creditWallet, validate(creditWalletSchema), creditWalletAction);

module.exports = router;