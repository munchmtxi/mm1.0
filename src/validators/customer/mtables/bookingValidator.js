'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = {
  createReservation: Joi.object({
    customerId: Joi.number().integer().required(),
    tableId: Joi.number().integer().required(),
    branchId: Joi.number().integer().required(),
    date: Joi.date().iso().required(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    partySize: Joi.number().integer().min(mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY).max(mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY).required(),
    dietaryPreferences: Joi.array().items(Joi.string().valid(...mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
    specialRequests: Joi.string().max(1000).optional().allow(''),
    seatingPreference: Joi.string().valid(...mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES).optional(),
  }),

  updateReservation: Joi.object({
    bookingId: Joi.number().integer().required(),
    date: Joi.date().iso().optional(),
    time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    partySize: Joi.number().integer().min(mtablesConstants.TABLE_MANAGEMENT.MIN_TABLE_CAPACITY).max(mtablesConstants.TABLE_MANAGEMENT.MAX_TABLE_CAPACITY).optional(),
    dietaryPreferences: Joi.array().items(Joi.string().valid(...mtablesConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS)).optional(),
    specialRequests: Joi.string().max(1000).optional().allow(''),
    seatingPreference: Joi.string().valid(...mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES).optional(),
  }),

  cancelBooking: Joi.object({
    bookingId: Joi.number().integer().required(),
  }),

  processCheckIn: Joi.object({
    bookingId: Joi.number().integer().required(),
    qrCode: Joi.string().when('method', { is: mtablesConstants.CHECK_IN_METHODS[0], then: Joi.string().required(), otherwise: Joi.string().optional() }),
    method: Joi.string().valid(...mtablesConstants.CHECK_IN_METHODS).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }),

  getBookingHistory: Joi.object({
    customerId: Joi.number().integer().required(),
  }),

  submitBookingFeedback: Joi.object({
    bookingId: Joi.number().integer().required(),
    rating: Joi.number().integer().min(mtablesConstants.FEEDBACK_SETTINGS.MIN_RATING).max(mtablesConstants.FEEDBACK_SETTINGS.MAX_RATING).required(),
    comment: Joi.string().max(2000).optional().allow(''),
  }),
};