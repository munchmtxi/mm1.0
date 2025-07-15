'use strict';

const backupService = require('@services/common/backupService');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = {
  async createBackup(req, res) {
    try {
      const { adminId, data } = req.body;
      const backup = await backupService.backupAdminData(adminId, data);
      res.status(200).json({ status: 'success', backupId: backup.id });
    } catch (error) {
      res.status(500).json({
        error: `${adminSystemConstants.ERROR_CODES.BACKUP_RESTORE_FAILED}: ${localizationConstants.getMessage('backup.failed', req.language)}`,
      });
    }
  },
};