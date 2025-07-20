/**
 * zohoMailClient.js
 * Utility for sending emails via Zoho Mail API.
 */

'use strict';

const axios = require('axios');
const config = require('@config/config');
const logger = require('@utils/logger');

// Configure Zoho Mail
const zohoClient = axios.create({
  baseURL: 'https://mail.zoho.com/api',
  headers: { Authorization: `Zoho-oauthtoken ${process.env.ZOHO_MAIL_TOKEN}` },
});

/**
 * Sends an email
 * @param {string} recipient - Recipient email
 * @param {string} message - Email body
 * @param {Object} data - Additional data (e.g., subject)
 * @returns {Promise<Object>} - Result with messageId and metadata
 */
async function sendEmail(recipient, message, data = {}) {
  try {
    const response = await zohoClient.post('/accounts/emails', {
      toAddress: recipient,
      fromAddress: process.env.ZOHO_EMAIL_FROM || 'no-reply@mm1.com',
      subject: data.subject || 'MM1 Notification',
      content: `<p>${message}</p>`,
    });

    const messageId = response.data.data.mailId;
    logger.logApiEvent('Email sent', { recipient, messageId });
    return { messageId, metadata: { sentAt: new Date() } };
  } catch (error) {
    logger.logErrorEvent(`Failed to send email: ${error.message}`, { recipient });
    throw error;
  }
}

module.exports = { sendEmail };