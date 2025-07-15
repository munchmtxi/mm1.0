// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\socket\handlers\merchant\staff\roleManagementHandler.js
'use strict';

const roleManagementEvents = require('@socket/events/merchant/staff/roleManagementEvents');

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on(roleManagementEvents.ROLE_ASSIGNED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(roleManagementEvents.ROLE_ASSIGNED, data);
    });

    socket.on(roleManagementEvents.PERMISSIONS_UPDATED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(roleManagementEvents.PERMISSIONS_UPDATED, data);
    });

    socket.on(roleManagementEvents.COMPLIANCE_VERIFIED, (data) => {
      socket.to(`staff:${data.staffId}`).emit(roleManagementEvents.COMPLIANCE_VERIFIED, data);
    });
  });
}

module.exports = {
  setupSocketHandlers,
};