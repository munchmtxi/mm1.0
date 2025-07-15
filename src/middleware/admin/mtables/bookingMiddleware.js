'use strict';

const Joi = require('joi');
const mtablesConstants = require('@constants/admin/mtablesConstants');
const { formatMessage } = require('@utils/localizationService');
const { AppError } = require('@utils/AppError');

function validateRequest(validationSchema) {
  return async (req, res, next) => {
    try {
      if (validationSchema.params) {
        await validationSchema.params.validateAsync(req.params, { abortEarly: false });
      }
      if (validationSchema.body) {
        await validationSchema.body.validateAsync(req.body, { abortEarly: false });
      }
      next();
    } catch (error) {
      next(new AppError(
        formatMessage('error.invalid_input'),
        400,
        mtablesConstants.ERROR_CODES.INVALID_INPUT,
        error.details.map(detail => detail.message)
      ));
    }
  };
}

function checkPermission(permission) {
  return async (req, res, next) => {
    try {
      const userPermissions = req.user.permissions || [];
      if (!userPermissions.includes(permission)) {
        throw new AppError(
          formatMessage('error.permission_denied'),
          403,
          mtablesConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validateMonitorBookings: validateRequest(require('@validators/admin/mtables/bookingValidator').monitorBookings),
  validateManageTableAdjustments: validateRequest(require('@validators/admin/mtables/bookingValidator').manageTableAdjustments),
  validateCloseBookings: validateRequest(require('@validators/admin/mtables/bookingValidator').closeBookings),
  checkTableMonitorPermission: checkPermission(mtablesConstants.PERMISSIONS.TABLE_MONITOR),
  checkTableAssignPermission: checkPermission(mtablesConstants.PERMISSIONS.TABLE_ASSIGN),
};