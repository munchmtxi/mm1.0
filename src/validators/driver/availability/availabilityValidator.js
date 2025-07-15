'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driver/driverConstants');

const setAvailabilitySchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  date: Joi.string().isoDate().required(),
  start_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  end_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
}).unknown(false);

const getAvailabilitySchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const toggleAvailabilitySchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  isAvailable: Joi.boolean().required(),
}).unknown(false);

module.exports = {
  setAvailability: setAvailabilitySchema,
  getAvailability: getAvailabilitySchema,
  toggleAvailability: toggleAvailabilitySchema,
};