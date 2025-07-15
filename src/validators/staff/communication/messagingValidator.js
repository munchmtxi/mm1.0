// messagingValidator.js
// Validation schemas for staff messaging endpoints.

'use strict';

const Joi = require('joi');

const sendMessageSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
  receiverId: Joi.number().integer().positive().required(),
  content: Joi.string().min(1).max(1000).required(),
});

const broadcastAnnouncementSchema = Joi.object({
  scheduleId: Joi.number().integer().positive().required(),
  content: Joi.string().min(1).max(1000).required(),
});

const logCommunicationSchema = Joi.object({
  staffId: Joi.number().integer().positive().required(),
});

module.exports = {
  sendMessageSchema,
  broadcastAnnouncementSchema,
  logCommunicationSchema,
};