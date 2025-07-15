'use strict';

const Joi = require('joi');
const driverConstants = require('@constants/driverConstants');

const reportIncidentSchema = Joi.object({
  incident_type: Joi.string()
    .valid(...driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES)
    .required(),
  description: Joi.string().max(1000).optional(),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).optional(),
  ride_id: Joi.number().integer().positive().optional(),
  delivery_order_id: Joi.number().integer().positive().optional(),
}).xor('ride_id', 'delivery_order_id').with('ride_id', []).with('delivery_order_id', []);

const sendDiscreetAlertSchema = Joi.object({
  alertType: Joi.string()
    .valid(...driverConstants.SAFETY_CONSTANTS.ALERT_TYPES)
    .required(),
});

module.exports = {
  reportIncident: {
    body: reportIncidentSchema,
  },
  triggerSOS: {},
  getSafetyStatus: {},
  sendDiscreetAlert: {
    body: sendDiscreetAlertSchema,
  },
};