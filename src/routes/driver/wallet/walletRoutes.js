'use strict';

const express = require('express');
const router = express.Router();
const walletController = require('@controllers/driver/wallet/walletController');
const walletValidator = require('@validators/driver/wallet/walletValidator');
const walletMiddleware = require('@middleware/driver/walletService');
const validate = require('@middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Driver Wallet
 *   description: Driver wallet balance and transaction management
 */

/**
 * @swagger
 * /driver/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Driver Wallet]
 *     responses:
 *       description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                     properties:
 *                       driver_id: { type: integer }
 *                       wallet_id: { type: integer }
 *                       balance: { type: number }
 *                       currency: { type: string }
 *                       locked_balance: { type: number }
 *       404:
 *         description: Driver not found
 */
router.get(
  '/balance',
  validate(walletValidator.getWalletBalance),
  walletMiddleware.checkDriverExists,
  walletController.getWalletBalance
);

/**
 * @swagger
 * /driver/wallet/update:
 *   post:
 *     summary: Update balance (earnings or tips)
 *     tags: [Driver Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *             properties:
 *               id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: ['earning', 'tip']
 *     responses:
 *       200:
 *         description: Balance updated successfully
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
  '/update',
  validate(walletValidator.updateBalance),
  walletMiddleware.checkDriverExists,
  walletController.updateBalance
);

/**
 * @swagger
 * /driver/wallet/lock:
 *   post:
 *     summary: Lock funds in wallet
 *     tags: [Driver Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               id:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Funds locked successfully
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
 *         description: Insufficient funds or invalid amount
 *       404:
 *         description: Driver or wallet not found
 */
router.post(
  '/lock',
  validate(walletValidator.lockBalance),
  walletMiddleware.checkDriverExists,
  walletController.lockBalance
);

/**
 * @swagger
 * /driver/wallet/unlock:
 *   post:
 *     summary: Unlock funds in wallet
 *     tags: [Driver Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               id:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Funds unlocked successfully
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
 *         description: Insufficient locked funds or invalid amount
 *       404:
 *         description: Driver or wallet not found
 */
router.post(
  '/unlock',
  validate(walletValidator.unlockBalance),
  walletMiddleware.checkDriverExists,
  walletController.unlockBalance
);

module.exports = router;