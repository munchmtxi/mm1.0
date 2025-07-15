'use strict';

/**
 * Backup and Recovery Service
 * Manages archiving of admin profile data for compliance and recovery.
 * Uses adminSystemConstants for backup settings and error codes.
 */

const Backup = require('@models');
const securityService = require('@services/common/securityService');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');

/**
 * Backs up admin profile data before deletion or major updates.
 * @param {number} adminId - ID of the admin.
 * @param {Object} data - Data to archive (e.g., user and admin records).
 * @returns {Object} Created backup record.
 * @throws {Error} If backup fails.
 */
async function backupAdminData(adminId, data) {
  try {
    const dataSizeMB = Buffer.byteLength(JSON.stringify(data), 'utf8') / (1024 * 1024);
    if (dataSizeMB > adminSystemConstants.PLATFORM_CONSTANTS.BACKUP_SETTINGS.MAX_BACKUP_SIZE_MB) {
      throw new Error(`Backup size exceeds ${adminSystemConstants.PLATFORM_CONSTANTS.BACKUP_SETTINGS.MAX_BACKUP_SIZE_MB} MB`);
    }

    const encryptedData = securityService.encryptData(JSON.stringify(data));

    const backupRecord = await Backup.create({
      admin_id: adminId,
      data: encryptedData,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return backupRecord;
  } catch (error) {
    throw new Error(`${adminSystemConstants.ERROR_CODES.BACKUP_RESTORE_FAILED}: Backup failed: ${error.message}`);
  }
}

module.exports = {
  backupAdminData,
};