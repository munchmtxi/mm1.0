'use strict';

const Joi = require('joi');
const munchConstants = require('@constants/common/munchConstants');

const createBatchDeliverySchema = Joi.object({
  deliveryIds: Joi.array()
    .items(Joi.number().integer().positive())
    .max(munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.BATCH_DELIVERY_LIMIT)
    .required(),
});

const updateBatchDeliveryStatusSchema = Joi.object({
  batchId: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES)
    .required(),
});

module.exports = {
  createBatchDelivery: {
    body: createBatchDeliverySchema,
  },
  getBatchDeliveryDetails: {
    params: Joi.object({
      batchId: Joi.number().integer().positive().required(),
    }),
  },
  updateBatchDeliveryStatus: {
    body: updateBatchDeliveryStatusSchema,
  },
  optimizeBatchDeliveryRoute: {
    params: Joi.object({
      batchId: Joi.number().integer().positive().required(),
    }),
  },
};