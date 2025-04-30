'use strict';

const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const StaffProfileService = require('@services/staff/profile/staffProfileService');
const staffProfileValidator = require('@validators/staff/profile/staffProfileValidator');

/**
 * Bind staff-specific profile events.
 */
function setupProfileHandlers(io, socket) {
  const emitError = (event, error) => {
    socket.emit('profile:error', {
      message: error.message,
      code: error.code || 'SOCKET_ERROR',
    });
    logger.error('Socket error emitted', {
      event,
      userId: socket.user.id,
      error: error.message,
    });
  };

  socket.on('profile:fetch', async (callback) => {
    try {
      const profile = await StaffProfileService.getProfile(socket.user.id);
      socket.emit('profile:data', profile);
      logger.info('Staff profile fetched', { userId: socket.user.id });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: profile });
      }
    } catch (err) {
      logger.error('Staff profile fetch failed', { error: err.message, userId: socket.user.id });
      emitError('profile:fetch', err);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: err.message });
      }
    }
  });

  socket.on('profile:update', async (data, callback) => {
    try {
      // Validate update data using Joi schema
      const { error, value } = staffProfileValidator.updatePersonalInfo.validate(data, { abortEarly: false });
      if (error) {
        const message = error.details.map((d) => d.message).join(', ');
        throw new AppError(`Validation failed: ${message}`, 400, 'VALIDATION_FAILED');
      }

      const updatedProfile = await StaffProfileService.updatePersonalInfo(socket.user.id, value, socket.user);
      socket.emit('profile:update:success', updatedProfile);
      io.to(`staff:${socket.user.id}`).emit('profile:updated', updatedProfile);
      logger.info('Staff profile updated', { userId: socket.user.id, updatedFields: Object.keys(data) });

      if (typeof callback === 'function') {
        callback({ status: 'success', data: updatedProfile });
      }
    } catch (err) {
      logger.error('Staff profile update failed', { error: err.message, userId: socket.user.id });
      emitError('profile:update', err);
      if (typeof callback === 'function') {
        callback({ status: 'error', message: err.message });
      }
    }
  });
}

module.exports = { setupProfileHandlers };