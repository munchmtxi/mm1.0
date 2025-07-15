'use strict';

const Joi = require('joi');
const mparkConstants = require('@constants/common/mparkConstants');

/**
 * Joi validation schemas for booking-related endpoints.
 */
module.exports = {
  createBooking: Joi.object({
    spaceId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[0] }), // INVALID_PARKING_SPOT
    bookingType: Joi.string().valid(...mparkConstants.BOOKING_CONFIG.BOOKING_TYPES).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }), // INVALID_BOOKING_DURATION
    startTime: Joi.date().iso().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    endTime: Joi.date().iso().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    checkInMethod: Joi.string().valid(...mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    vehicleDetails: Joi.object().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    city: Joi.string().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }), // INVALID_LOCATION
    merchantId: Joi.number().integer().optional().messages({ '*': mparkConstants.ERROR_TYPES[0] }),
  }),
  cancelBooking: Joi.object({
    bookingId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[9] }), // PARKING_BOOKING_NOT_FOUND
  }),
  extendBooking: Joi.object({
    bookingId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[9] }),
    duration: Joi.number().integer().min(1).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
  }),
  checkInBooking: Joi.object({
    bookingId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[9] }),
    method: Joi.string().valid(...mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    location: Joi.object().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
  }),
  searchAvailableParking: Joi.object({
    city: Joi.string().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
    type: Joi.string().valid(...mparkConstants.SPACE_CONFIG.SPACE_TYPES).required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
    date: Joi.date().iso().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
  }),
  createSubscriptionBooking: Joi.object({
    subscriptionId: Joi.string().required().messages({ '*': mparkConstants.ERROR_TYPES[0] }),
    spaceId: Joi.number().integer().required().messages({ '*': mparkConstants.ERROR_TYPES[0] }),
    bookingType: Joi.string().valid(...mparkConstants.BOOKING_CONFIG.BOOKING_TYPES).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    startTime: Joi.date().iso().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    endTime: Joi.date().iso().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    checkInMethod: Joi.string().valid(...mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS).required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    vehicleDetails: Joi.object().required().messages({ '*': mparkConstants.ERROR_TYPES[2] }),
    city: Joi.string().required().messages({ '*': mparkConstants.ERROR_TYPES[6] }),
    merchantId: Joi.number().integer().optional().messages({ '*': mparkConstants.ERROR_TYPES[0] }),
  }),
};