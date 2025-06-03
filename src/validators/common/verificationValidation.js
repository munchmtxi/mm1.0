'use strict';

const Joi = require('joi');
const authConstants = require('@constants/common/authConstants');

const validateSubmitVerification = async (req, res, next) => {
  const schema = Joi.object({
    user_id: Joi.number().integer().positive().required(),
    document_type: Joi.string()
      .valid(...Object.values(authConstants.VERIFICATION_CONSTANTS.VERIFICATION_DOCUMENT_TYPES).flat())
      .required(),
    document_url: Joi.string().uri().required(),
    method: Joi.string()
      .valid(...Object.values(authConstants.VERIFICATION_CONSTANTS.VERIFICATION_METHODS))
      .required(),
  });

  try {
    await schema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: error.details.map((err) => err.message),
    });
  }
};

const validateApproveVerification = async (req, res, next) => {
  const schema = Joi.object({
    verification_id: Joi.number().integer().positive().required(),
  });

  try {
    await schema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: error.details.map((err) => err.message),
    });
  }
};

module.exports = { validateSubmitVerification, validateApproveVerification };