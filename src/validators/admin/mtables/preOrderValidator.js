'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const paymentConstants = require('@constants/paymentConstants');
const { formatMessage } = require('@utils/localizationService');

const monitorPreOrdersSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_booking_id'),
      'number.integer': formatMessage('error.missing_booking_id'),
      'number.positive': formatMessage('error.missing_booking_id'),
      'any.required': formatMessage('error.missing_booking_id'),
    }),
});

const manageFriendInvitationsSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_invitation_details'),
      'number.integer': formatMessage('error.missing_invitation_details'),
      'number.positive': formatMessage('error.missing_invitation_details'),
      'any.required': formatMessage('error.missing_invitation_details'),
    }),
  invitation: Joi.object({
    friendIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .max(mtablesConstants.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE - 1)
      .required()
      .messages({
        'array.base': formatMessage('error.missing_invitation_details'),
        'array.min': formatMessage('error.missing_invitation_details'),
        'array.max': formatMessage('error.group_size_exceeded', {
          limit: mtablesConstants.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE,
        }),
        'any.required': formatMessage('error.missing_invitation_details'),
      }),
    message: Joi.string().max(255).optional(),
  }).required(),
});

const processPartyPaymentsSchema = Joi.object({
  bookingId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': formatMessage('error.missing_payment_splits'),
      'number.integer': formatMessage('error.missing_payment_splits'),
      'number.positive': formatMessage('error.missing_payment_splits'),
      'any.required': formatMessage('error.missing_payment_splits'),
    }),
  paymentDetails: Joi.object({
    splits: Joi.array()
      .min(1)
      .items(
        Joi.object({
          customerId: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
              'number.base': formatMessage('error.missing_payment_splits'),
              'number.integer': formatMessage('error.missing_payment_splits'),
              'number.positive': formatMessage('error.missing_payment_splits'),
              'any.required': formatMessage('error.missing_payment_splits'),
            }),
          amount: Joi.number()
            .positive()
            .required()
            .messages({
              'number.base': formatMessage('error.missing_payment_splits'),
              'number.positive': formatMessage('error.missing_payment_splits'),
              'any.required': formatMessage('error.missing_payment_splits'),
            }),
          walletId: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
              'number.base': formatMessage('error.missing_payment_splits'),
              'number.integer': formatMessage('error.missing_payment_splits'),
              'number.positive': formatMessage('error.missing_payment_splits'),
              'any.required': formatMessage('error.missing_payment_splits'),
            }),
        })
      )
      .required()
      .messages({
        'array.base': formatMessage('error.missing_payment_splits'),
        'array.min': formatMessage('error.missing_payment_splits'),
        'any.required': formatMessage('error.missing_payment_splits'),
      }),
  }).required(),
});

module.exports = {
  monitorPreOrders: { body: monitorPreOrdersSchema },
  manageFriendInvitations: { body: manageFriendInvitationsSchema },
  processPartyPayments: { body: processPartyPaymentsSchema },
};