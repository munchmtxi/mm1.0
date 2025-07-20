/**
 * twilioClient.js
 * Utility for sending SMS and WhatsApp messages via Twilio.
 */

'use strict';

const twilio = require('twilio');
const config = require('@config/config');
const logger = require('@utils/logger');

// Initialize Twilio client
const client = twilio(config.whatsapp.twilioAccountSid, config.whatsapp.twilioAuthToken);

/**
 * Sends an SMS
 * @param {string} recipient - Recipient phone number
 * @param {string} message - SMS body
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Result with sid and metadata
 */
async function sendSMS(recipient, message, data = {}) {
  try {
    const response = await client.messages.create({
      body: message,
      from: config.sms.senderId,
      to: recipient,
    });
    logger.logApiEvent('SMS sent', { recipient, sid: response.sid });
    return { sid: response.sid, metadata: { sentAt: new Date() } };
  } catch (error) {
    logger.logErrorEvent(`Failed to send SMS: ${error.message}`, { recipient });
    throw error;
  }
}

/**
 * Sends a WhatsApp message
 * @param {string} recipient - Recipient phone number (e.g., whatsapp:+1234567890)
 * @param {string} message - WhatsApp message body
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Result with sid and metadata
 */
async function sendWhatsApp(recipient, message, data = {}) {
  try {
    const response = await client.messages.create({
      body: message,
      from: config.whatsapp.twilioWhatsappNumber,
      to: recipient,
    });
    logger.logApiEvent('WhatsApp message sent', { recipient, sid: response.sid });
    return { sid: response.sid, metadata: { sentAt: new Date() } };
  } catch (error) {
    logger.logErrorEvent(`Failed to send WhatsApp message: ${error.message}`, { recipient });
    throw error;
  }
}

module.exports = { sendSMS, sendWhatsApp };