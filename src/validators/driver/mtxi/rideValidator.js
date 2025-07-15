'use strict';

const Joi = require('joi');
const rideConstants = require('@constants/common/rideConstants');

const coordinateSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

const acceptRideSchema = Joi.object({
  rideId: Joi.number().integer().positive().required(),
});

const updateRideStatusSchema = Joi.object({
  rideId: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid(...rideConstants.RIDE_STATUSES)
    .required(),
});

const communicateWithPassengerSchema = Joi.object({
  rideId: Joi.number().integer().positive().required(),
  message: Joi.string().min(1).max(500).required(),
});

module.exports = {
  acceptRide: {
    params: acceptRideSchema,
  },
  getRideDetails: {
    params: Joi.object({
      rideId: Joi.number().integer().positive().required(),
    }),
  },
  updateRideStatus: {
    body: updateRideStatusSchema,
  },
  communicateWithPassenger: {
    body: communicateWithPassengerSchema,
  },
};