'use strict';

const backupEvents = require('@socket/events/common/backupEvents');
const backupService = require('@services/common/backupService');
const io = require('@socket');

module.exports = (socket) => {
  socket.on(backupEvents.BACKUP_CREATED, async ({ adminId, data }) => {
    try {
      const backup = await backupService.backupAdminData(adminId, data);
      socket.emit(backupEvents.BACKUP_CREATED, { status: 'success', backupId: backup.id });
    } catch (error) {
      socket.emit(backupEvents.BACKUP_FAILED, { error: error.message });
    }
  });
};