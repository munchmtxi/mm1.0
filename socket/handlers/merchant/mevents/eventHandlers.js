'use strict';

const eventEvents = require('@socket/events/merchant/mevents/eventEvents');
const logger = require('@utils/logger');

function setupEventHandlers(io, socket) {
  socket.on(eventEvents.EVENT_CREATED, (data) => {
    logger.info('Event created event received', { eventId: data.eventId });
    socket.to(`merchant:${data.merchantId}`).emit(eventEvents.EVENT_CREATED, data);
  });

  socket.on(eventEvents.GROUP_BOOKINGS_MANAGED, (data) => {
    logger.info('Group bookings managed event received', { eventId: data.eventId });
    socket.to(`merchant:${data.merchantId}`).emit(eventEvents.GROUP_BOOKINGS_MANAGED, data);
  });

  socket.on(eventEvents.GROUP_CHAT_FACILITATED, (data) => {
    logger.info('Group chat facilitated event received', { eventId: data.eventId });
    socket.to(`merchant:${data.merchantId}`).emit(eventEvents.GROUP_CHAT_FACILITATED, data);
  });
}

module.exports = { setupEventHandlers };