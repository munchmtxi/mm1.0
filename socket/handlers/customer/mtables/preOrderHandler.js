// src/socket/handlers/customer/mtables/preOrderHandler.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const mtablesConstants = require('@constants/common/mtablesConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');

const handlePreOrderEvents = (io, socket) => {
  const userId = socket.user.customer_id;
  const role = socket.user.role;
  const languageCode = socket.user.languageCode || localizationConstants.DEFAULT_LANGUAGE;

  socket.on(mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION, async (data) => {
    try {
      await socketService.emit(io, mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION, {
        userId,
        role,
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        amount: data.amount,
        auditAction: mtablesConstants.AUDIT_TYPES.PRE_ORDER_CREATED,
      }, `customer:${userId}`, languageCode);

      await notificationService.sendNotification({
        userId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.PRE_ORDER_CONFIRMATION,
        messageKey: 'mtables.pre_order_created',
        messageParams: { orderNumber: data.orderNumber, amount: data.amount },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1],
        languageCode,
        orderId: data.orderId,
      });
    } catch (error) {
      socket.emit('error', {
        message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[0]),
      });
    }
  });

  socket.on(mtablesConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST, async (data) => {
    try {
      await socketService.emit(io, mtablesConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST, {
        userId,
        role,
        orderId: data.orderId,
        amount: data.amount,
        reference: data.reference,
        auditAction: mtablesConstants.AUDIT_TYPES.BILL_SPLIT_PROCESSED,
      }, `customer:${userId}`, languageCode);

      await notificationService.sendNotification({
        userId,
        notificationType: mtablesConstants.NOTIFICATION_TYPES.BILL_SPLIT_REQUEST,
        messageKey: 'mtables.bill_split_request',
        messageParams: { orderNumber: data.orderNumber, amount: data.amount },
        priority: customerConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[2],
        languageCode,
        orderId: data.orderId,
      });
    } catch (error) {
      socket.emit('error', {
        message: formatMessage('customer', 'mtables', languageCode, mtablesConstants.ERROR_TYPES[0]),
      });
    }
  });
};

module.exports = { handlePreOrderEvents };