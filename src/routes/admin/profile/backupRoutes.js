'use strict';

const express = require('express');
const router = express.Router();
const backupController = require('@controllers/common/backupController');
const authMiddleware = require('@middleware/common/authMiddleware');
const backupValidator = require('@validators/common/AdminBackupValidator');

router.post(
  '/backup',
  authMiddleware.requireBackupPermission,
  backupValidator.validateBackupInput,
  backupController.createBackup
);

module.exports = router;