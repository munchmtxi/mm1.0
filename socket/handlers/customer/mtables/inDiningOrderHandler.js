'use strict';

const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const socketEvents = require('@socket/events/customer/mtables/socketEvents');

/**
 * Handles customer order update event
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Event data
 * @param {string} room - Room to emit to
 * @param {string} languageCode - Language code
 */
function handleCustomerOrderUpdate(io, socket, data, room, languageCode) {
  const message = formatMessage('customer', 'mtables', languageCode, 'notifications.order.order_updated', {
    orderNumber: data.orderNumber,
    status: data.status,
  });
  io.to(room).emit(socketEvents.CUSTOMER_ORDER_UPDATE, { ...data, message });
}

/**
 * Handles feedback submitted event
 * @param {Object} io - Socket.IO instance
 * @param {Object} socket - Socket instance
 * @param {Object} data - Event data
 * @param {string} room - Room to emit to
 * @param {string} languageCode - Language code
 */
function handleFeedbackSubmitted(io, socket, data, room, languageCode) {
  const message = formatMessage('customer', 'mtables', languageCode, 'notifications.order.feedback_submitted', {
    orderNumber: data.orderNumber,
    rating: data.rating,
  });
  io.to(room).emit(socketEvents.FEEDBACK_SUBMITTED, { ...data, message });
}

module.exports = {
  handleCustomerOrderUpdate,
  handleFeedbackSubmitted,
};