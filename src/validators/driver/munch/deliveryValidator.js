'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');

const acceptDeliverySchema = Joi.object({
  deliveryId: Joi.number().integer().positive().required(),
});

const updateDeliveryStatusSchema = Joi.object({
  deliveryId: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES)
    .required(),
});

const communicateWithCustomerSchema = Joi.object({
  deliveryId: Joi.number().integer().positive().required(),
  message: Joi.string().min(1).max(500).required(),
});

module.exports = {
  acceptDelivery: {
    params: acceptDeliverySchema,
  },
  getDeliveryDetails: {
    params: Joi.object({
      deliveryId: Joi.number().integer().positive().required(),
    }),
  },
  updateDeliveryStatus: {
    body: updateDeliveryStatusSchema,
  },
  communicateWithCustomer: {
    body: communicateWithCustomerSchema,
  },
};