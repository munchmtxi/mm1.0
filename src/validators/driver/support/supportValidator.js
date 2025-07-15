'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');

const createSupportTicketSchema = Joi.object({
  service_type: Joi.string()
    .valid(...driverConstants.SUPPORT_CONSTANTS.SERVICE_TYPES)
    .required(),
  issue_type: Joi.string()
    .valid(...driverConstants.SUPPORT_CONSTANTS.ISSUE_TYPES)
    .required(),
  description: Joi.string().min(10).required(),
  ride_id: Joi.number().integer().positive().optional(),
  delivery_order_id: Joi.number().integer().positive().optional(),
}).when(Joi.object({ service_type: 'mtxi' }), {
  then: Joi.object({
    ride_id: Joi.number().integer().positive().required(),
    delivery_order_id: Joi.forbidden(),
  }),
}).when(Joi.object({ service_type: 'munch' }), {
  then: Joi.object({
    delivery_order_id: Joi.number().integer().positive().required(),
    ride_id: Joi.forbidden(),
  }),
});

const ticketIdSchema = Joi.object({
  ticketId: Joi.number().integer().positive().required(),
});

module.exports = {
  createSupportTicket: {
    body: createSupportTicketSchema,
  },
  trackTicketStatus: {
    params: ticketIdSchema,
  },
  getCancellationPolicies: {},
  escalateTicket: {
    params: ticketIdSchema,
  },
};