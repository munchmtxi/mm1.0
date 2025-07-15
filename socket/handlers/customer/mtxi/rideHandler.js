'use strict';

const rideEvents = require('@socket/events/customer/mtxi/rideEvents');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const customerConstants = require('@constants/customer/customerConstants');

/**
 * Ride socket handler
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    socket.on(rideEvents.RIDE_REQUESTED, async (data, callback) => {
      await socketService.handleEvent(io, socket, rideEvents.RIDE_REQUESTED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[0],
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(rideEvents.RIDE_UPDATED, async (data, callback) => {
      await socketService.handleEvent(io, socket, rideEvents.RIDE_UPDATED, data);
      await auditService.logAction({
        userId: data.userId,
        role: data.role,
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'RIDE_UPDATED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(rideEvents.RIDE_CANCELLED, async (data, callback) => {
      await socketService.handleEvent(io, socket, rideEvents.RIDE_CANCELLED, data);
      await auditService.logAction({
        userId: data.userId,
        role: data.role,
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'RIDE_CANCELLED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(rideEvents.FRIEND_INVITED, async (data, callback) => {
      await socketService.handleEvent(io, socket, rideEvents.FRIEND_INVITED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'FRIEND_INVITED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });

    socket.on(rideEvents.FEEDBACK_SUBMITTED, async (data, callback) => {
      await socketService.handleEvent(io, socket, rideEvents.FEEDBACK_SUBMITTED, data);
      await auditService.logAction({
        userId: data.userId,
        role: 'customer',
        action: customerConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'FEEDBACK_SUBMITTED'),
        details: data.details,
        ipAddress: socket.handshake.address,
      });
      callback({ success: true });
    });
  });
};