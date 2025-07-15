'use strict';

const socketService = require('@services/common/socketService');
const gamificationEvents = require('@subscriptions/events/staff/wallet/gamificationEvents');
const logger = require('@utils/logs');

function setupGamificationHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(gamificationEvents.POINTS_CONVERTED, (data) => {
      logger.info('Points converted event received', { data });
      socketService.emitEvent(`munch:reward:${data.staffId}`, gamificationEvents.POINTS_EVENTS, data);
    });

    socket.on(gamificationEvents.EARNINGS_TRACKED, (data) => {
      logger.info('Earnings tracked event received', { data });
      socketService.emitEvent(`munch:reward:${data.staffId}`, gamificationEvents.TRACKED_EVENTS, data);
    });

    socket.on(gamificationEvents.REWARD_REDEEMED, (data) => {
      logger.info('Reward redeemed event received', { data });
      socketService.emitEvent(`munch:reward:${data.staffId}`, gamificationEvents.REDEEMED_EVENTS, data);
    });

    socket.on(gamificationEvents.ANALYTICS_SYNCED, (data) => {
      logger.info('Analytics synced event received', { data });
      socketService.emit('munch:reward:${data.staffId}', gamificationEvents.SYNCED_EVENTS, data);
    });

    socket.on(gamificationEvents.REWARD_CREDITED, (data) => {
      logger.info('Reward credited event received', { data });
      socketService.emit('munch:reward:${data.staffId}', gamificationEvents.CREDITED_EVENTS, data);
    });
  });
}

module.exports = { setupGamificationHandlers };