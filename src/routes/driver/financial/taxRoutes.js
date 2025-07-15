'use strict';

const express = require('express');
const router = express.Router();
const {
  calculateTax,
  generateTaxReport,
  updateTaxSettings,
  exportTaxData,
} = require('@controllers/driver/financial/taxController');
const {
  validateCalculateTax,
  validateGenerateTaxReport,
  validateUpdateTaxSettings,
  validateExportTaxData,
} = require('@middleware/driver/financial/taxMiddleware');

/**
 * @swagger
 * /driver/financial/tax/calculate:
 *   get:
 *     summary: Calculate driver tax obligations
 *     tags: [Driver Tax]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly]
 *     responses:
 *       200:
 *         description: Tax calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     period:
 *                       type: string
 *                     taxableAmount:
 *                       type: number
 *                     taxAmount:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid period
 *       404:
 *         description: Driver or wallet not found
 *       500:
 *         description: Server error
 */
router.get('/calculate', validateCalculateTax, calculateTax);

/**
 * @swagger
 * /driver/financial/tax/report:
 *   get:
 *     summary: Generate driver tax report
 *     tags: [Driver Tax]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monthly, quarterly, yearly]
 *     responses:
 *       200:
 *         description: Tax report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     driverId:
 *                       type: integer
 *                     period:
 *                       type: string
 *                     records:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           taxableAmount:
 *                             type: number
 *                           taxAmount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                           country:
 *                             type: string
 *                           created_at:
 *                             type: string
 *                             format: date-time
 *       400:
 *         description: Invalid period
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/report', validateGenerateTaxReport, generateTaxReport);

/**
 * @swagger
 * /driver/financial/tax/settings:
 *   patch:
 *     summary: Update driver tax settings
 *     tags: [Driver Tax]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filingFrequency
 *             properties:
 *               filingFrequency:
 *                 type: string
 *                 enum: [monthly, quarterly, none]
 *               country:
 *                 type: string
 *                 enum: [PH, EU, CA, AU, UK, MW, TZ, KE, MZ, NG, ZA, IN, BR, US]
 *     responses:
 *       200:
 *         description: Tax settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Driver registered
 *                 data:
 *                   type: null
 *       400:
 *         description: Invalid filing frequency or country
 *       404:
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.patch('/settings', validateUpdateTaxSettings, updateTaxSettings);

/**
 * @swagger
 * /driver/financial/tax/export:
 *   get:
 *     summary: Export driver tax data
 *     tags: [Driver Tax]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *     responses:
 *       200:
 *         description: Tax data exported successfully
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
 *         description: Driver not found
 *       500:
 *         description: Server error
 */
router.get('/export', validateExportTaxData, exportTaxData);

module.exports = router;