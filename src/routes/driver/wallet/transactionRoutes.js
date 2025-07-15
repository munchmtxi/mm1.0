'use strict';

const express = require('express');
const router = express.Router();
const transactionController = require('@controllers/driver/wallet/transactionController');
const transactionValidator = require('@validators/driver/wallet/transactionValidator');
const transactionMiddleware = require('@middleware/driver/wallet/transactionMiddleware');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Transaction
 *   description: Driver wallet transaction management
 */

/**
 * @swagger
 * /driver/wallet/transaction/record:
 *   post:
 *     summary: Record a wallet transaction
 *     tags: [Driver Transaction]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - amount
 *               - type
 *             properties:
 *               taskId:
 *                 type: integer
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: ['earning', 'tip', 'payout', 'refund']
 *     responses:
 *       200:
 *         description: Transaction recorded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid transaction type or amount
 *       404:
 *         description: Driver or wallet not found
 */
router.post(
  '/transaction/record',
  validate(transactionValidator.recordTransaction),
  transactionMiddleware.checkDriverExists,
  transactionController.recordTransaction
);

/**
 * @swagger
 * /driver/wallet/transaction/history:
 *   get:
 *     summary: Retrieve transaction history
 *     tags: [Driver Transaction]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: ['daily', 'weekly', 'monthly', 'yearly']
 *         required: true
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid period
 *       404:
 *         description: Driver or wallet not found
 */
router.get(
  '/transaction/history',
  validate(transactionValidator.getTransactionHistory),
  transactionMiddleware.checkDriverExists,
  transactionController.getTransactionHistory
);

/**
 * @swagger
 * /driver/wallet/transaction/reverse:
 *   post:
 *     summary: Reverse a transaction
 *     tags: [Driver Transaction]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *             properties:
 *               transactionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Transaction reversed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Insufficient funds or transaction already refunded
 *       404:
 *         description: Driver, wallet, or transaction not found
 */
router.post(
  '/transaction/reverse',
  validate(transactionValidator.reverseTransaction),
  transactionMiddleware.checkDriverExists,
  transactionController.reverseTransaction
);

/**
 * @swagger
 * /driver/wallet/transaction/export:
 *   get:
 *     summary: Export transaction data
 *     tags: [Driver Transaction]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: ['csv', 'json']
 *         required: true
 *     responses:
 *       200:
 *         description: Transaction data exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid format
 *       404:
 *         description: Driver or wallet not found
 */
router.get(
  '/transaction/export',
  validate(transactionValidator.exportTransactionData),
  transactionMiddleware.checkDriverExists,
  transactionController.exportTransactionData
);

module.exports = router;