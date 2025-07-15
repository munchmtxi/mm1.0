'use strict';

const Joi = require('joi');
const AppError = require('@utils/AppError');
const mparkConstants = require('@constants/common/mparkConstants');

/**
 * Middleware to validate request data using Joi schema.
 */
module.exports = (schema) => async (req, res, next) => {
  try {
    const data = { ...req.body, ...req.params, ...req.query };
    await schema.validateAsync(data, { abortEarly: false });
    next();
  } catch (error) {
    next(new AppError(error.message, 400, mparkConstants.ERROR_TYPES[9]));
  }
};