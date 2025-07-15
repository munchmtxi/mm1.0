// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\merchant\staff\schedulingHandler.js
'use strict';

const schedulingEvents = require('@socket/events/merchant/staff/schedulingEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(schedulingEvents.SCHEDULE_CREATED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(schedulingEvents.SCHEDULE_CREATED, data);
    });

    socket.on(schedulingEvents.TIME_TRACKED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(schedulingEvents.TIME_TRACKED, data);
    });

    socket.on(schedulingEvents.SCHEDULE_NOTIFIED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(schedulingEvents.SCHEDULE_NOTIFIED, data);
    });

    socket.on(schedulingEvents.SCHEDULE_ADJUSTED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(schedulingEvents.SCHEDULE_ADJUSTED, data);
    });
  });
}

module.exports = {
  setupSocketHandlers,
};