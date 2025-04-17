'use strict';
const Joi = require('joi');

module.exports = {
  updatePersonalInfo: Joi.object({
    first_name: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    position: Joi.string().optional(),
    work_location: Joi.object({ latitude: Joi.number(), longitude: Joi.number() }).optional(),
    branch_id: Joi.number().integer().optional(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(100).required(),
  }),
};