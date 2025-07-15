// taxValidator.js
// Validation schemas for tax-related endpoints.

'use strict';

const Joi = require('joi');
const taxConstants = require('@constants/common/taxConstants');

const calculateTaxSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  period: Joi.string().valid(...taxConstants.SUPPORTED_PERIODS).required(),
});

const generateTaxReportSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  period: Joi.string().valid(...taxConstants.SUPPORTED_PERIODS).required(),
});

const updateTaxSettingsSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
  settings: Joi.object({
    taxId: Joi.string().optional(),
    exemptions: Joi.array().items(Joi.string()).optional(),
    filingFrequency: Joi.string().valid(...taxConstants.SUPPORTED_FILING_FREQUENCIES).optional(),
  }).required(),
});

const ensureTaxComplianceSchema = Joi.object({
  merchantId: Joi.number().integer().positive().required(),
});

module.exports = {
  calculateTaxSchema,
  generateTaxReportSchema,
  updateTaxSettingsSchema,
  ensureTaxComplianceSchema,
};