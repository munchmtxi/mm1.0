'use strict';

const Joi = require('joi');
const mparkConstants = require('@constants/common/mparkConstants');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Joi validation schemas for parking-related endpoints.
 */
module.exports = {
  listNearbyParking: Joi.object({
    latitude: Joi.number().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }), // INVALID_LOCATION
    longitude: Joi.number().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
  }),
  getParkingLotDetails: Joi.object({
    lotId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
  }),
  reserveParking: Joi.object({
    lotId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[0] }), // INVALID_PARKING_SPOT
    spaceId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[0] }),
    duration: Joi.number().integer().min(1).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }), // INVALID_BOOKING_DURATION
    city: Joi.string().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
  }),
  checkParkingAvailability: Joi.object({
    lotId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
    date: Joi.date().iso().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
  }),
  manageParkingSubscription: Joi.object({
    action: Joi.string().valid('create', 'renew', 'cancel').required().messages({ '*': customerConstants.ERROR_CODES[0] }), // INVALID_CUSTOMER
    plan: Joi.string().required().messages({ '*': customerConstants.ERROR_CODES[0] }),
  }),
  getSubscriptionStatus: Joi.object({}),
};