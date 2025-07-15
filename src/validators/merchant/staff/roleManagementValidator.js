// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\validators\merchant\staff\roleManagementValidator.js
'use strict';

const { body, param } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');
const frontOfHouseConstants = require('@constants/staff/frontOfHouseConstants');
const backOfHouseConstants = require('@constants/staff/backOfHouseConstants');
const kitchenConstants = require('@constants/staff/kitchenConstants');
const managerConstants = require('@constants/staff/managerConstants');
const butcherConstants = require('@constants/staff/butcherConstants');
const baristaConstants = require('@constants/staff/baristaConstants');
const cashierConstants = require('@constants/staff/cashierConstants');
const driverConstants = require('@constants/staff/driverConstants');

const roleConstantsMap = {
  front_of_house: frontOfHouseConstants,
  back_of_house: backOfHouseConstants,
  kitchen: kitchenConstants,
  manager: managerConstants,
  butcher: butcherConstants,
  barista: baristaConstants,
  cashier: cashierConstants,
  driver: driverConstants,
};

const assignRoleValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('role').isIn(staffConstants.STAFF_PROFILE_CONSTANTS.ALLOWED_STAFF_TYPES).withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_STAFF_TYPE') ? 'INVALID_STAFF_TYPE' : 'Invalid role'),
  body('branchId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch ID'),
];

const updatePermissionsValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  body('branchId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch ID'),
  body('permissions').isArray({ min: 1 }).withMessage(staffConstants.STAFF_ERROR_CODES.includes('PERMISSION_DENIED') ? 'PERMISSION_DENIED' : 'Permissions must be a non-empty array'),
  body('permissions.*').isString().withMessage(staffConstants.STAFF_ERROR_CODES.includes('PERMISSION_DENIED') ? 'PERMISSION_DENIED' : 'Invalid permission format'),
];

const verifyRoleComplianceValidation = [
  param('staffId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('STAFF_NOT_FOUND') ? 'STAFF_NOT_FOUND' : 'Invalid staff ID'),
  param('branchId').isInt().withMessage(staffConstants.STAFF_ERROR_CODES.includes('INVALID_BRANCH') ? 'INVALID_BRANCH' : 'Invalid branch ID'),
];

module.exports = {
  assignRoleValidation,
  updatePermissionsValidation,
  verifyRoleComplianceValidation,
};