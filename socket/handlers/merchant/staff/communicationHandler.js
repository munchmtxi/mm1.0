// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\merchant\staff\communicationHandler.js
'use strict';

const communicationEvents = require('@socket/events/merchant/staff/communicationEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(communicationEvents.MESSAGE_SENT, (data) => {
      socket.to(`staff:${data.receiverId}`).emit(communicationEvents.MESSAGE_SENT, data);
    });

    socket.on(communicationEvents.SHIFT_ANNOUNCED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(communicationEvents.SHIFT_ANNOUNCED, data);
    });

    socket.on(communicationEvents.CHANNEL_MANAGED, (data) => {
      socket.to(`branch:${data.branchId}`).emit(communicationEvents.CHANNEL_MANAGED, data);
    });

    socket.on(communicationEvents.COMMUNICATION_TRACKED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(communicationEvents.COMMUNICATION_TRACKED, data);
    });
  });
}

module.exports = {
  setupSocketHandlers
};