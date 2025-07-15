'use strict';

const Joi = require('joi');
const rideConstants = require('@constants/common/rideConstants');

const addPassengerSchema = Joi.object({
  rideId: Joi.number().integer().positive().required(),
  passengerId: Joi.number().integer().positive().required(),
});

const removePassengerSchema = Joi.object({
  rideId: Joi.number().integer().positive().required(),
  passengerId: Joi.number().integer().positive().required(),
});

module.exports = {
  addPassenger: {
    body: addPassengerSchema,
  },
  removePassenger: {
    body: removePassengerSchema,
  },
  getSharedRideDetails: {
    params: Joi.object({
      rideId: Joi.number().integer().positive().required(),
    }),
  },
  optimizeSharedRideRoute: {
    params: Joi.object({
      rideId: Joi.number().integer().positive().required(),
    }),
  },
};