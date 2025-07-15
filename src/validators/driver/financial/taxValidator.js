'use strict';

const Joi = require('joi');
const taxConstants = require('@constants/taxConstants');

const calculateTaxSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  period: Joi.string()
    .valid(...taxConstants.SUPPORTED_PERIODS)
    .required(),
}).unknown(false);

const generateTaxReportSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  period: Joi.string()
    .valid(...taxConstants.SUPPORTED_PERIODS)
    .required(),
}).unknown(false);

const updateTaxSettingsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  filingFrequency: Joi.string()
    .valid(...taxConstants.SUPPORTED_FILING_FREQUENCIES)
    .required(),
  country: Joi.string()
    .valid(...Object.keys(taxConstants.TAX_RATES))
    .optional(),
}).unknown(false);

const exportTaxDataSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  format: Joi.string().valid('csv', 'json').required(),
}).unknown(false);

module.exports = {
  calculateTax: calculateTaxSchema,
  generateTaxReport: generateTaxReportSchema,
  updateTaxSettings: updateTaxSettingsSchema,
  exportTaxData: exportTaxDataSchema,
};