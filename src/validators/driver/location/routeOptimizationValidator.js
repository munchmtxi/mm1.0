'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');

const coordinateSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
});

const calculateRouteSchema = Joi.object({
  origin: coordinateSchema.required(),
  destination: coordinateSchema.required(),
});

const updateRouteSchema = Joi.object({
  waypoints: Joi.array()
    .items(coordinateSchema)
    .max(driverConstants.LOCATION_CONSTANTS.MAP_SETTINGS.MAX_WAYPOINTS_PER_ROUTE)
    .optional(),
});

module.exports = {
  calculateRoute: {
    body: calculateRouteSchema,
  },
  updateRoute: {
    params: Joi.object({
      driverId: Joi.number().integer().positive().required(),
      routeId: Joi.number().integer().positive().required(),
    }),
    body: updateRouteSchema,
  },
  getRouteDetails: {
    params: Joi.object({
      routeId: Joi.number().integer().positive().required(),
    }),
  },
};