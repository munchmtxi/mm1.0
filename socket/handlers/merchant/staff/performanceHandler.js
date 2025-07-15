// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\merchant\staff\performanceHandler.js
'use strict';

const performanceEvents = require('@socket/events/merchant/staff/performanceEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(performanceEvents.METRIC_MONITORED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(performanceEvents.METRIC_MONITORED, data);
    });

    socket.on(performanceEvents.PERFORMANCE_REPORT, (data) => {
      socket.to(`staff:${data.staffId}`).emit(performanceEvents.PERFORMANCE_REPORT, data);
    });

    socket.on(performanceEvents.TRAINING_DISTRIBUTED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(performanceEvents.TRAINING_DISTRIBUTED, data);
    });
  });
}

module.exports = {
  setupSocketHandlers,
};