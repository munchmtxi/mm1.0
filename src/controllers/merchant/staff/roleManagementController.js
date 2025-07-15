// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\controllers\merchant\staff\roleManagementController.js
'use strict';

const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const roleManagementService = require('@services/merchant/staff/roleManagementService');

async function assignRole(req, res) {
  try {
    const { staffId } = req.params;
    const roleData = req.body;
    const io = req.app.get('io');
    const result = await roleManagementService.assignRole(staffId, roleData, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function updatePermissions(req, res) {
  try {
    const { staffId } = req.params;
    const permissionsData = req.body;
    const io = req.app.get('io');
    const result = await roleManagementService.updatePermissions(staffId, permissionsData, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

async function verifyRoleCompliance(req, res) {
  try {
    const { staffId, branchId } = req.params;
    const io = req.app.get('io');
    const result = await roleManagementService.verifyRoleCompliance(staffId, branchId, io, auditService, socketService, notificationService, pointService);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  assignRole,
  updatePermissions,
  verifyRoleCompliance,
};