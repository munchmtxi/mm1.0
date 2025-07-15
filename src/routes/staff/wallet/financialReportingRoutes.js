'use strict';

const express = require('express');
const router = express.Router();
const financialReportingController = require('@controllers/staff/wallet/financialReportingController');
const financialReportingValidator = require('@validators/staff/wallet/financialReportingValidator');
const financialReportingMiddleware = require('@middleware/staff/wallet/financialReportingMiddleware');

/**
 * @swagger
 * /staff/reporting/payment/{staffId}:
 *   get:
 *     summary: Generate a payment report for a staff member
 *     tags: [FinancialReporting]
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
 *       201:
 *         description: Payment report generated successfully
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
 *                     report_type:
 *                       type: string
 *                     data:
 *                       type: object
 *                       properties:
 *                         total_salary:
 *                           type: number
 *                         total_bonus:
 *                           type: number
 *                         transactions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id: staff_id
 *                               type: integer
 *                               amount: number
 *                               type: string
 *                               created_at: string
 *                     generated_by:
 *                       type: integer
 *                 message:
 *                   type: string
 *       404:
 *         description: Staff not found
 *       500:
 *         description: Server error
 */
router.get('/payment/:staffId', financialReportingMiddleware.checkReportingPermission, financialReportingValidator.generatePaymentReportValidation, financialReportingController.generatePaymentReport);

/**
 * @swagger
 * /staff/reporting/wallet/{staffId}:
 *   get:
 *     summary: Summarize wallet activity for a staff member
 *     tags: [FinancialReporting]
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
 *         description: Wallet activity summarized successfully
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
 *                     total_deposits:
 *                       type: number
 *                     total_withdrawals:
 *                       type: number
 *                     total_rewards:
 *                       type: number
 *                     transaction_count:
 *                       type: integer
 *                 message:
 *                   type: string
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/wallet/:staffId', financialReportingMiddleware.checkReportingPermission, financialReportingValidator.summarizeWalletActivityValidation, financialReportingController.summarizeWalletActivity);

/**
 * @swagger
 * /staff/reporting/export/{staffId}:
 *   get:
 *     summary: Export financial data for a staff member's wallet
 *     tags: [FinancialReporting]
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
 *         description: Financial data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data: {}
 *                 message:
 *                   type: string
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/export/:staffId', financialReportingMiddleware.checkReportingPermission, financialReportingValidator.exportFinancialDataValidation, financialReportingController.exportFinancialData);

/**
 * @swagger
 * /staff/reporting/taxes/{staffId}:
 *   get:
 *     summary: Track tax compliance for a staff member
 *     tags: [FinancialReporting]
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
 *       201:
 *         description: Tax compliance tracked successfully
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
 *                     staff_id: staffId
 *                       type: integer
 *                     period:
 *                       type: string
 *                     taxable_amount:
 *                       type: number
 *                     tax_amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *                     country:
 *                       type: string
 *                 message:
 *                   type: string
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Server error
 */
router.get('/taxes/:staffId', financialReportingMiddleware.checkReportingPermission, financialReportingValidator.trackTaxComplianceValidation, financialReportingController.trackTaxCompliance);

/**
 * @swagger
 * /staff/reporting/audit/{staffId}:
 *   get:
 *     summary: Generate audit trail for a staff member's financial transactions
 *     tags: [FinancialReporting]
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
 *         description: Financial audit trail generated successfully
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
router.get('/audit/:staffId', financialReportingMiddleware.checkReportingPermission, financialReportingValidator.auditFinancialTransactionsValidation, financialReportingController.auditFinancialTransactions);

module.exports = router;