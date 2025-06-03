// src/utils/responseHandler.js
'use strict';

/**
 * Utility to send standardized HTTP responses.
 * @param {Object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {Object} payload - response payload.
 * @param {string} payload.message - human-readable message.
 * @param {any} payload.data - response data.
 * @param {Object} [payload.meta] - optional metadata (pagination, etc.).
 */
function sendResponse(res, statusCode, { message, data, meta = null }) {
  const responseBody = {
    status: 'success',
    message,
    data,
  };
  if (meta !== null) responseBody.meta = meta;
  res.status(statusCode).json(responseBody);
}

module.exports = { sendResponse };
