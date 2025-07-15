'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('@controllers/staff/wallet/paymentController');
const paymentValidator = require('@validators/staff/wallet/paymentValidator');
const paymentMiddleware = require('@middleware/staff/wallet/paymentMiddleware');

/**
 * @swagger
 * /staff/payment/salary:
 *   post:
 *     summary: Process a salary payment to staff wallet
 *     tags: [Payment]
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
 *                 description: The salary amount
 *     responses:
 *       201:
 *         description: Salary payment processed successfully
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
 *                     staff_id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     payment_method:
 *                       type: string
 *                     status:
 *                       type: string
 *                     merchant_id:
 *                       type: integer
 *                     currency:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.post('/salary', paymentMiddleware.checkPaymentPermission, paymentValidator.processSalaryPaymentValidation, paymentController.processSalaryPayment);

/**
 * @swagger
 * /staff/payment/bonus:
 *   post:
 *     summary: Process a bonus payment to staff wallet
 *     tags: [Payment]
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
 *                 description: The bonus amount
 *     responses:
 *       201:
 *         description: Bonus payment processed successfully
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
 *                     staff_id:
 *                       type: integer
 *                     amount:
 *                       type: number
 *                     payment_method:
 *                       type: string
 *                     status:
 *                       type: string
 *                     merchant_id:
 *                       type: integer
 *                     currency:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.post('/bonus', paymentMiddleware.checkPaymentPermission, paymentValidator.processBonusPaymentValidation, paymentController.processBonusPayment);

/**
 * @swagger
 * /staff/payment/withdrawal:
 *   post:
 *     summary: Confirm a withdrawal from staff wallet
 *     tags: [Payment]
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
 *         description: Withdrawal confirmed successfully
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
router.post('/withdrawal', paymentMiddleware.checkPaymentPermission, paymentValidator.confirmWithdrawalValidation, paymentController.confirmWithdrawal);

/**
 * @swagger
 * /staff/payment/audit/{staffId}:
 *   get:
 *     summary: Retrieve payment audit logs for a staff member
 *     tags: [Payment]
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
 *         description: Payment audit logs retrieved successfully
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
 *                       user_id:
 *                         type: integer
 *                       action:
 *                         type: string
 *                       details:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.get('/audit/:staffId', paymentMiddleware.checkPaymentPermission, paymentValidator.logPaymentAuditValidation, paymentController.logPaymentAudit);

/**
 * @swagger
 * /staff/payment/error:
 *   post:
 *     summary: Report a payment error by creating a support ticket
 *     tags: [Payment]
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
 *               - errorDetails
 *             properties:
 *               staffId:
 *                 type: integer
 *                 description: The ID of the staff member
 *               errorDetails:
 *                 type: object
 *                 required:
 *                   - description
 *                 properties:
 *                   description:
 *                     type: string
 *                     description: Description of the payment error
 *     responses:
 *       201:
 *         description: Payment error reported successfully
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
 *                     user_id:
 *                       type: integer
 *                     service_type:
 *                       type: string
 *                     issue_type:
 *                       type: string
 *                     description:
 *                       type: string
 *                     status:
 *                       type: string
 *                     priority:
 *                       type: string
 *                     ticket_number:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.post('/error', paymentMiddleware.checkPaymentPermission, paymentValidator.handlePaymentErrorsValidation, paymentController.handlePaymentErrors);

module.exports = router;