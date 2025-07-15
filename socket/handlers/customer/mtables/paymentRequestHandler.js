// socket/handlers/customer/mtables/paymentRequestHandler.js
'use strict';

const socketService = require('@services/common/socketService');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');

const handlePaymentRequest = async (io, socket, data) => {
  const { userId, role, bookingId, amount, billSplitType } = data;
  const languageCode = socket.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    if (role !== 'customer') {
      throw new Error(customerConstants.ERROR_CODES[2]); // PERMISSION_DENIED
    }

    await socketService.emit(io, 'BILL_SPLIT_REQUEST_SENT', {
      userId,
      role,
      bookingId,
      amount,
      billSplitType,
    }, `customer:${userId}`, languageCode);

    socket.emit('BILL_SPLIT_REQUEST_SUCCESS', {
      success: true,
      message: formatMessage('customer', 'notifications', languageCode, 'payment_request_sent', { amount, bookingId }),
    });
  } catch (error) {
    logger.logErrorEvent(`Socket payment request failed: ${error.message}`, { userId, bookingId });
    socket.emit('BILL_SPLIT_REQUEST_ERROR', {
      success: false,
      message: formatMessage('customer', 'errors', languageCode, error.message, {}),
      errorCode: error.message,
    });
  }
};

const handlePreOrderPaymentRequest = async (io, socket, data) => {
  const { userId, role, bookingId, orderId, amount, billSplitType } = data;
  const languageCode = socket.user?.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  try {
    if (role !== 'customer') {
      throw new Error(customerConstants.ERROR_CODES[2]); // PERMISSION_DENIED
    }

    await socketService.emit(io, 'PRE_ORDER_BILL_SPLIT_REQUEST_SENT', {
      userId,
      role,
      bookingId,
      orderId,
      amount,
      billSplitType,
    }, `customer:${userId}`, languageCode);

    socket.emit('PRE_ORDER_BILL_SPLIT_REQUEST_SUCCESS', {
      success: true,
      message: formatMessage('customer', 'notifications', languageCode, 'pre_order_payment_request_sent', { amount, orderId }),
    });
  } catch (error) {
    logger.logErrorEvent(`Socket pre-order payment request failed: ${error.message}`, { userId, bookingId, orderId });
    socket.emit('PRE_ORDER_BILL_SPLIT_REQUEST_ERROR', {
      success: false,
      message: formatMessage('customer', 'errors', languageCode, error.message, {}),
      errorCode: error.message,
    });
  }
};

module.exports = {
  handlePaymentRequest,
  handlePreOrderPaymentRequest,
};