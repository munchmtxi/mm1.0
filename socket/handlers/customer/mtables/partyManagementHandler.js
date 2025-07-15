'use strict';

const socketService = require('@services/common/socketService');
const PartyManagementEvents = require('@socket/events/customer/mtables/PartyManagementEvents');
const logger = require('@utils/logger');

/**
 * Handle party management socket events
 */
module.exports = (io, socket) => {
  socket.on(PartyManagementEvents.PARTY_INVITE_SENT, async (data) => {
    try {
      await socketService.emit(io, PartyManagementEvents.PARTY_INVITE_SENT, data, `customer:${data.userId}`);
      logger.info('Party invite event emitted', { userId: data.userId, bookingId: data.details.bookingId });
    } catch (error) {
      logger.error('Failed to emit party invite event', { error: error.message });
    }
  });

  socket.on(PartyManagementEvents.PARTY_STATUS_UPDATED, async (data) => {
    try {
      await socketService.emit(io, PartyManagementEvents.PARTY_STATUS_UPDATED, data, `customer:${data.userId}`);
      logger.info('Party status updated event emitted', { userId: data.userId, bookingId: data.details.bookingId });
    } catch (error) {
      logger.error('Failed to emit party status updated event', { error: error.message });
    }
  });

  socket.on(PartyManagementEvents.PARTY_MEMBER_REMOVED, async (data) => {
    try {
      await socketService.emit(io, PartyManagementEvents.PARTY_MEMBER_REMOVED, data, `customer:${data.userId}`);
      logger.info('Party member removed event emitted', { userId: data.userId, bookingId: data.details.bookingId });
    } catch (error) {
      logger.error('Failed to emit party member removed event', { error: error.message });
    }
  });

  socket.on(PartyManagementEvents.BILL_SPLIT_REQUESTED, async (data) => {
    try {
      await socketService.emit(io, PartyManagementEvents.BILL_SPLIT_REQUESTED, data, `customer:${data.userId}`);
      logger.info('Bill split requested event emitted', { userId: data.userId, bookingId: data.details.bookingId });
    } catch (error) {
      logger.error('Failed to emit bill split requested event', { error: error.message });
    }
  });
};