'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driver/driverConstants');

const createShiftSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().greater(Joi.ref('start_time')).required(),
  shift_type: Joi.string()
    .valid(...[driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.STANDARD, driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.BATCH])
    .required(),
}).unknown(false);

const getShiftDetailsSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const updateShiftSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  shiftId: Joi.number().integer().positive().required(),
  start_time: Joi.date().iso().optional(),
  end_time: Joi.date().iso().greater(Joi.ref('start_time')).optional(),
  shift_type: Joi.string()
    .valid(...[driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.STANDARD, driverConstants.MUNCH_CONSTANTS.DELIVERY_TYPES.BATCH])
    .optional(),
  status: Joi.string()
    .valid('scheduled', 'active', 'completed', 'cancelled')
    .optional(),
}).unknown(false);

const notifyHighDemandSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

module.exports = {
  createShift: createShiftSchema,
  getShiftDetails: getShiftDetailsSchema,
  updateShift: updateShiftSchema,
  notifyHighDemand: notifyHighDemandSchema,
};