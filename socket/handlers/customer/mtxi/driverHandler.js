'use strict';

const driverEvents = require('@socket/events/customer/mtxi/driverEvents');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const driverConstants = require('@constants/driver/driverConstants');

/**
 * Driver socket handler
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on(driverEvents.DRIVER_TRACKED, async (data, callback) => {
      await socketService.handleEvent(io, socket, driverEvents.DRIVER_TRACKED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'DRIVER_TRACKED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(driverEvents.LOCATION_UPDATED, async (data, callback) => {
      await socketService.handleEvent(io, socket, driverEvents.LOCATION_UPDATED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'driver',
        action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'LOCATION_UPDATED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });
  });
};