'use strict';

const logger = require('@utils/logger');
const socketConstants = require('@constants/common/socketConstants');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = (fn) => {
  return async (io, ...args) => {
    try {
      await Promise.resolve(fn(io, ...args));
    } catch (err) {
      logger.error('catchAsyncSocket caught error', { error: err.message, stack: err.stack });
      const [event, data, room, languageCode = localizationConstants.DEFAULT_LANGUAGE] = args;
      const errorData = {
        status: 'error',
        message: localizationConstants.getMessage('socket.error', languageCode, { message: err.message || 'Something went wrong' }),
        code: err.statusCode || 500,
        errors: err.errors || [],
        timestamp: new Date().toISOString(),
      };

      if (room && io) {
        io.to(room).emit(socketConstants.SOCKET_EVENT_TYPES.ERROR, errorData);
        logger.info('Error emitted to room', { event, room, error: err.message });
      } else if (io) {
        io.emit(socketConstants.SOCKET_EVENT_TYPES.ERROR, errorData);
        logger.info('Error broadcasted', { event, error: err.message });
      }
    }
  };
};