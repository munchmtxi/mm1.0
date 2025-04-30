'use strict';

const logger = require('@utils/logger');
const { handleTipDetailsRequest, handleTipDisputeRequest } = require('@socket/handlers/admin/mtxi/tipHandler');

module.exports = (io, socket) => {
  logger.info('Setting up tip events', { userId: socket.user?.id });

  socket.on('tip:requestDetails', (data, callback) => {
    logger.info('Received tip:requestDetails event', { userId: socket.user?.id, data });
    handleTipDetailsRequest(socket, data, callback);
  });

  socket.on('tip:requestDispute', (data, callback) => {
    logger.info('Received tip:requestDispute event', { userId: socket.user?.id, data });
    handleTipDisputeRequest(socket, data, callback);
  });
};