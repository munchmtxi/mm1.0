'use strict';

const socketService = require('@services/common/socketService');
const socketConstants = require('@constants/common/socketConstants');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');
const catchAsyncSocket = require('@utils/catchAsyncSocket');

/** Handles table search socket events */
const handleTableSearch = catchAsyncSocket(async (socket, io, data) => {
  const { userId, tables } = data;
  await socketService.emit(io, socketConstants.SOCKET_EVENT_TYPES.TABLE_SEARCH_RESULT, {
    userId,
    role: 'customer',
    tables,
    auditAction: socketConstants.SOCKET_AUDIT_ACTIONS.TABLE_SEARCH,
  }, `customer:${userId}`, data.languageCode || localizationConstants.DEFAULT_LANGUAGE);
});

module.exports = { handleTableSearch };