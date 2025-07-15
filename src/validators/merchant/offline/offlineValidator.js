'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchant/merchantConstants');
const { AppError } = require('@utils/AppError');
const { formatMessage } = require('@utils/localization');

const cacheOrdersSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  orders: Joi.array().items(
    Joi.object({
      items: Joi.array().min(1).required(),
      total_amount: Joi.number().positive().required(),
      customer_id: Joi.number().integer().positive().required(),
      currency: Joi.string().valid(...merchantConstants.BRANCH_SETTINGS.SUPPORTED_CURRENCIES).optional(),
    }),
  ).min(1).required(),
});

const cacheBookingsSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
  bookings: Joi.array().items(
    Joi.object({
      booking_date: Joi.date().required(),
      booking_time: Joi.string().required(),
      customer_id: Joi.number().integer().positive().required(),
    }),
  ).min(1).required(),
});

const syncOfflineDataSchema = Joi.object({
  restaurantId: Joi.number().integer().positive().required(),
});

const validateCacheOrders = (req, res, next) => {
  const { error } = cacheOrdersSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'offline', 'en', 'errors.invalidOrderData'), 400, merchantConstants.ERROR_CODES[5]);
  next();
};

const validateCacheBookings = (req, res, next) => {
  const { error } = cacheBookingsSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'offline', 'en', 'errors.invalidBookingData'), 400, merchantConstants.ERROR_CODES[5]);
  next();
};

const validateSyncOfflineData = (req, res, next) => {
  const { error } = syncOfflineDataSchema.validate(req.body);
  if (error) throw new AppError(formatMessage('merchant', 'offline', 'en', 'errors.invalidOrderData'), 400, merchantConstants.ERROR_CODES[5]);
  next();
};

module.exports = {
  validateCacheOrders,
  validateCacheBookings,
  validateSyncOfflineData,
};