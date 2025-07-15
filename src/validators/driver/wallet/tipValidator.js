'use strict';

const Joi = require('joi');
const tipConstants = require('@constants/common/tipConstants');

const recordTipSchema = Joi.object({
  taskId: Joi.number().integer().positive().required(),
  amount: Joi.number()
    .min(tipConstants.TIP_SETTINGS.MIN_AMOUNT)
    .max(tipConstants.TIP_SETTINGS.MAX_AMOUNT)
    .required(),
});

const notifyTipReceivedSchema = Joi.object({
  taskId: Joi.number().integer().positive().required(),
});

module.exports = {
  recordTip: {
    body: recordTipSchema,
  },
  getTipHistory: {},
  notifyTipReceived: {
    body: notifyTipReceivedSchema,
  },
  awardTipPoints: {},
};