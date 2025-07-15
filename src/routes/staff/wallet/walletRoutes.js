'use strict';

const express = require('express');
const router = express.Router();
const walletController = require('@controllers/staff/wallet/walletController');
const walletValidator = require('@validators/staff/wallet/walletValidator');
const walletMiddleware = require('@middleware/staff/wallet/walletMiddleware');

/**
 * @swagger
 * /staff/wallet/balance/{staffId}:
 *   get:
 *     summary: Retrieve staff wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
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
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/balance/:staffId', walletMiddleware.checkWalletPermission, walletValidator.getWalletBalanceValidation, walletController.getWalletBalance);

/**
 * @swagger
 * /staff/wallet/history/{staffId}:
 *   get:
 *     summary: View staff wallet transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: staffId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the staff member
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       wallet_id:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       type:
 *                         type: string
 *                       status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/history/:staffId', walletMiddleware.checkWalletPermission, walletValidator.viewTransactionHistoryValidation, walletController.viewTransactionHistory);

/**
 * @swagger
 * /staff/wallet/withdrawal:
 *   post:
 *     summary: Submit a withdrawal request
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
 *               - staffId
 *               - amount
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               amount:
 *                 type: number
 *                 description: The withdrawal amount
 *     responses:
 *       201:
 *         description: Withdrawal request submitted successfully
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
 *                     id:
 *                       type: integer
 *                     wallet_id:
 *                       type: integer
 *                     staff_id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     method:
 *                       type: string
 *                     status:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Insufficient balance or invalid amount
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.post('/withdrawal', walletMiddleware.checkWalletPermission, walletValidator.requestWithdrawalValidation, walletController.requestWithdrawal);

/**
 * @swagger
 * /staff/wallet/sync:
 *   post:
 *     summary: Synchronize wallet with merchant
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
 *               - staffId
 *               - merchantId
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *     responses:
 *       200:
 *         description: Wallet synchronized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       403:
 *         description: Staff not associated with merchant
 *       404:
 *         description: Staff or merchant not found
 *       500:
 *         description: Server error
 */
router.post('/sync', walletMiddleware.checkWalletPermission, walletValidator.syncWithMerchantValidation, walletController.syncWithMerchant);

/**
 * @swagger
 * /staff/wallet/preferences:
 *   post:
 *     summary: Update wallet notification preferences
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
 *               - staffId
 *               - preferences
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               preferences:
 *                 type: object
 *                 description: Notification preferences (e.g., { push: true, email: false })
 *     responses:
 *       200:
 *         description: Wallet preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid preferences
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/preferences', walletMiddleware.checkWalletPermission, walletValidator.updateWalletPreferencesValidation, walletController.updateWalletPreferences);

module.exports = router;