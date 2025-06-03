'use strict';

const Joi = require('joi');
const tipConstants = require('@constants/common/tipConstants');

const createTipSchema = Joi.object({
  recipientId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().min(tipConstants.TIP_SETTINGS.MIN_AMOUNT).max(tipConstants.TIP_SETTINGS.MAX_AMOUNT).required(),
  currency: Joi.string().valid(...tipConstants.TIP_SETTINGS.SUPPORTED_CURRENCIES).required(),
  rideId: Joi.number().integer().positive().optional(),
  orderId: Joi.number().integer().positive().optional(),
  bookingId: Joi.number().integer().positive().optional(),
  eventServiceId: Joi.number().integer().positive().optional(),
  inDiningOrderId: Joi.number().integer().positive().optional(),
}).xor('rideId', 'orderId', 'bookingId', 'eventServiceId', 'inDiningOrderId');

const updateTipSchema = Joi.object({
  amount: Joi.number().positive().min(tipConstants.TIP_SETTINGS.MIN_AMOUNT).max(tipConstants.TIP_SETTINGS.MAX_AMOUNT).optional(),
  status: Joi.string().valid(...tipConstants.TIP_SETTINGS.TIP_STATUSES).optional(),
}).or('amount', 'status');

module.exports = { createTipSchema, updateTipSchema };