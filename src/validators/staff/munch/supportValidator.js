// supportValidator.js
// Validation schemas for staff munch support endpoints.

'use strict';

const Joi = require('joi');

const handleOrderInquirySchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
  issue: Joi.object({
    description: Joi.string().min(10).max(500).required(),
    issue_type: Joi.string().valid('delivery_issue', 'order_issue', 'payment_issue', 'other').required(),
  }).required(),
});

const resolveOrderIssueSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
  resolution: Joi.string().min(10).max(500).required(),
});

const escalateOrderDisputeSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  handleOrderInquirySchema,
  resolveOrderIssueSchema,
  escalateOrderDisputeSchema,
};