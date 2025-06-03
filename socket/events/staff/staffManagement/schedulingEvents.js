'use strict';

/**
 * schedulingEvents.js
 * Socket events for munch scheduling (staff role).
 * Events: scheduling:shift_created, scheduling:shift_updated, scheduling:shift_notified, points:awarded.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logging');

function setupSchedulingEvents(io, socket) {
  socket.on('munch:scheduling:shift_event', (data) => {
    try {
      socketService.emit(io, 'scheduling:shift_created', {
        staffId: data.staffId,
        shiftId: data.shiftId,
      }, `munch:${data.staffId}`);
      logger.info('Shift created event emitted', data);
    } catch (error) {
      logger.error('Shift created event failed', { error: error.message, data });
    }
  });

  socket.on('munch:scheduling:shift_updated', (data) => {
    try {
      socketService.emit(io, 'scheduling:shift_updated', {
        shiftId: data.shiftId,
        updates: data.updates,
      }, `munch:scheduling:${data.staff_id}`);
      logger.info('Shift updated event emitted', data);
    } catch (error) {
      logger.error('Shift updated event failed', { error: error.message, data });
    }
  });

  socket.on('munch:scheduling:shift_notified', (data) => {
    try {
      socketService.emit(io, 'scheduling:shift_notified', {
        staffId: data.staffId,
      }, `munch:scheduling:${data.staffId}`);
      logger.info('Shift notified event emitted', data);
    } catch (error) {
      logger.error('Shift notified event failed', { error: error.message, data });
    });

  socket.on('munch:staff:points', (data) => {
    try {
      socketService.emit(io, 'staff:points:awarded', {
        staffId: data.staff_id,
        action: data.action,
        points: data.points,
      }, `munch:staff:${data.staff_id}`);
      logger.info('Scheduling points awarded event emitted', data);
    } catch (error) {
      logger.error('Scheduling points awarded event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch', { socketId: socket.id });
    setupSchedulingEvents(io, socket);
  });
}

module.exports = { initialize };