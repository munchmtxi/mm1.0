'use strict';

const subscriptionEvents = require('@socket/events/customer/mtxi/subscriptionEvents');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Subscription socket handler
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on(subscriptionEvents.SUBSCRIPTION_ENROLLED, async (data, callback) => {
      await socketService.handleEvent(io, socket, subscriptionEvents.SUBSCRIPTION_ENROLLED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_ENROLLED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(subscriptionEvents.SUBSCRIPTION_UPGRADED, async (data, callback) => {
      await socketService.handleEvent(io, socket, subscriptionEvents.SUBSCRIPTION_UPGRADED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_UPGRADED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(subscriptionEvents.SUBSCRIPTION_DOWNGRADED, async (data, callback) => {
      await socketService.handleEvent(io, socket, subscriptionEvents.SUBSCRIPTION_DOWNGRADED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_DOWNGRADED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(subscriptionEvents.SUBSCRIPTION_CANCELED, async (data, callback) => {
      await socketService.handleEvent(io, socket, subscriptionEvents.SUBSCRIPTION_CANCELED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'SUBSCRIPTION_CANCELED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });
  });
};