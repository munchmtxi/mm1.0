'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/customer/munch/munchConstants');

const createSupportTicketSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  issueType: Joi.string().valid(...Object.values(munchConstants.SUPPORT_TYPES.ISSUE_TYPES)).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
});

const trackTicketStatusSchema = Joi.object({
  ticketId: Joi.number().integer().required(),
});

const escalateTicketSchema = Joi.object({
  ticketId: Joi.number().integer().required(),
});

module.exports = { createSupportTicketSchema, trackTicketStatusSchema, escalateTicketSchema };