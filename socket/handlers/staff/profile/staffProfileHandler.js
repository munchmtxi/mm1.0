'use strict';
const staffProfileEvents = require('@socket/events/staff/profile/staffProfileEvents');
const logger = require('@utils/logger');

module.exports = (io) => {
  io.of('/staff').on('connection', (socket) => {
    logger.info('Staff socket connected', { userId: socket.user?.id });
    staffProfileEvents(socket, io);
  });
};