// messagingMiddleware.js
// Middleware for validating staff messaging requests.

'use strict';

const { sendMessageSchema, broadcastAnnouncementSchema, logCommunicationSchema } = require('@validators/staff/communication/messagingValidator');

async function validateSendMessage(req, res, next) {
  try {
    await sendMessageSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateBroadcastAnnouncement(req, res, next) {
  try {
    await broadcastAnnouncementSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

async function validateLogCommunication(req, res, next) {
  try {
    await logCommunicationSchema.validateAsync(req.body);
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

module.exports = {
  validateSendMessage,
  validateBroadcastAnnouncement,
  validateLogCommunication,
};