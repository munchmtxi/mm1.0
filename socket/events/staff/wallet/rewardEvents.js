'use strict';

/**
 * rewardEvents.js
 * Socket events for munch reward operations (staff role).
 * Events: reward:points_converted, reward:earnings_tracked, reward:redeemed,
 * reward:analytics_synced, reward:credited.
 * Last Updated: May 26, 2025
 */

const socketService = require('@services/common/socketService');
const logger = require('@utils/logger');

function setupRewardEvents(io, socket) {
  socket.on('munch:reward:points_converted', (data) => {
    try {
      socketService.emit(io, 'reward:points_converted', {
        staffId: data.staffId,
        points: data.points,
        amount: data.amount,
      }, `munch:reward:${data.staffId}`);
      logger.info('Points converted event emitted', data);
    } catch (error) {
      logger.error('Points converted event failed', { error: error.message, data });
    }
  });

  socket.on('munch:reward:earnings_tracked', (data) => {
    try {
      socketService.emit(io, 'reward:earnings_tracked', {
        staffId: data.staffId,
        rewards: data.rewards,
      }, `munch:reward:${data.staffId}`);
      logger.info('Earnings tracked event emitted', data);
    } catch (error) {
      logger.error('Earnings tracked event failed', { error: error.message, data });
    }
  });

  socket.on('munch:reward:redeemed', (data) => {
    try {
      socketService.emit(io, 'reward:redeemed', {
        staffId: data.staffId,
        rewardId: data.rewardId,
      }, `munch:reward:${data.staffId}`);
      logger.info('Reward redeemed event emitted', data);
    } catch (error) {
      logger.error('Reward redeemed event failed', { error: error.message, data });
    }
  });

  socket.on('munch:reward:analytics_synced', (data) => {
    try {
      socketService.emit(io, 'reward:analytics_synced', {
        staffId: data.staffId,
      }, `munch:reward:${data.staffId}`);
      logger.info('Analytics synced event emitted', data);
    } catch (error) {
      logger.error('Analytics synced event failed', { error: error.message, data });
    }
  });

  socket.on('munch:reward_credited', (data) => {
    try {
      socketService.emit(io, 'reward:credited', {
        staffId: data.staffId,
        amount: data.amount,
      }, `munch:reward:${data.staffId}`);
      logger.info('Reward credited event emitted', data);
    } catch (error) {
      logger.error('Reward credited event failed', { error: error.message, data });
    }
  });
}

function initialize(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connection for munch rewards', { socketId: socket.id });
    setupRewardEvents(io, socket);
  });
}

module.exports = { initialize };