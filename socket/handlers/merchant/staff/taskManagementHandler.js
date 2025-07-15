// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\merchant\staff\taskManagementHandler.js
'use strict';

const taskManagementEvents = require('@socket/events/merchant/staff/taskManagementEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(taskManagementEvents.TASK_ALLOCATED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(taskManagementEvents.TASK_ALLOCATED, data);
    });

    socket.on(taskManagementEvents.TASK_PROGRESS, (data) => {
      socket.to(`staff:${data.staffId}`).emit(taskManagementEvents.TASK_PROGRESS, data);
    });

    socket.on(taskManagementEvents.TASK_DELAY_NOTIFIED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(taskManagementEvents.TASK_DELAY_NOTIFIED, data);
    });
  });
}

module.exports = {
  setupSocketHandlers,
};