'use strict';

const Joi = require('joi');
const locationConstants = require('@constants/locationConstants');

const shareLocationSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  coordinates: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
}).unknown(false);

const getLocationSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
}).unknown(false);

const configureMapSchema = Joi.object({
  driverId: Joi.number().integer().positive().required(),
  country: Joi.string()
    .valid(...Object.keys(locationConstants.SUPPORTED_MAP_PROVIDERS))
    .required(),
}).unknown(false);

module.exports = {
  shareLocation: shareLocationSchema,
  getLocation: getLocationSchema,
  configureMap: configureMapSchema,
};