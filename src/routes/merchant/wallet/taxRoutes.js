// taxRoutes.js
// API routes for merchant tax operations.

'use strict';

const express = require('express');
const router = express.Router();
const taxController = require('@controllers/merchant/wallet/taxController');
const taxMiddleware = require('@middleware/merchant/wallet/taxMiddleware');

/**
 * @swagger
 * /merchant/wallet/tax/calculate:
 *   post:
 *     summary: Calculate tax obligations for a merchant
 *     tags: [Merchant Tax]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - period
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               period:
 *                 type: string
 *                 description: Time period (monthly, quarterly, yearly)
 *                 enum: [monthly, quarterly, yearly]
 *     responses:
 *       200:
 *         description: Tax obligations calculated successfully
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
 *                     taxableIncome:
 *                       type: number
 *                     taxObligation:
 *                       type: number
 *                     taxRate:
 *                       type: number
 *                     period:
 *                       type: string
 *                     currency:
 *                       type: string
 *                     country:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/calculate', taxMiddleware.validateCalculateTax, taxController.calculateTax);

/**
 * @swagger
 * /merchant/wallet/tax/report:
 *   post:
 *     summary: Generate a tax report for a merchant
 *     tags: [Merchant Tax]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - period
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: The ID of the merchant
 *               period:
 *                 type: string
 *                 description: Time period (monthly, quarterly, yearly)
 *                 enum: [monthly, quarterly, yearly]
 *     responses:
 *       200:
 *         description: Tax report generated successfully
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
 *                     merchantId:
 *                       type: integer
 *                     businessName:
 *                       type: string
 *                     period:
 *                       type: string
 *                     country:
 *                       type: string
 *                     taxRate:
 *                       type: number
 *                     taxableIncome:
 *                       type: number
 *                     taxObligation:
 *                       type: number
 *                     transactionCount:
 *                       type: integer
 *                     orderCount:
 *                       type: integer
 *                     currency:
 *                       type: string
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/report', taxMiddleware.validateGenerateTaxReport, taxController.generateTaxReport);

/**
 * @swagger
 * /merchant/wallet/tax/settings:
 *   post:
 *     summary: Update tax settings for a merchant
 *     tags: [Merchant Tax]
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
 *                 properties:
 *                   taxId:
 *                     type: string
 *                     description: Tax identification number
 *                   exemptions:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: List of tax exemptions
 *                   filingFrequency:
 *                     type: string
 *                     description: Filing frequency (monthly, quarterly, yearly, none)
 *                     enum: [monthly, quarterly, yearly, none]
 *     responses:
 *       200:
 *         description: Tax settings updated successfully
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
 *                     business_name:
 *                       type: string
 *                     business_type_details:
 *                       type: object
 *                       properties:
 *                         taxId:
 *                           type: string
 *                         exemptions:
 *                           type: array
 *                           items:
 *                             type: string
 *                         filingFrequency:
 *                           type: string
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/settings', taxMiddleware.validateUpdateTaxSettings, taxController.updateTaxSettings);

/**
 * @swagger
 * /merchant/wallet/tax/compliance:
 *   post:
 *     summary: Verify tax regulation compliance for a merchant
 *     tags: [Merchant Tax]
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
 *       200:
 *         description: Tax compliance verified
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
 *                     isCompliant:
 *                       type: boolean
 *                     complianceChecks:
 *                       type: object
 *                       properties:
 *                         hasTaxId:
 *                           type: boolean
 *                         validFilingFrequency:
 *                           type: boolean
 *                         meetsCountryRequirements:
 *                           type: boolean
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/compliance', taxMiddleware.validateEnsureTaxCompliance, taxController.ensureTaxCompliance);

module.exports = router;