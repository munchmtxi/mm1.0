'use strict';

const Joi = require('joi');
const merchantConstants = require('@constants/merchantConstants');
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
        merchantConstants.ERROR_CODES.INVALID_INPUT,
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
          merchantConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validateApproveMerchantOnboarding: validateRequest(require('@validators/admin/mtables/merchantValidator').approveMerchantOnboarding),
  validateManageMenus: validateRequest(require('@validators/admin/mtables/merchantValidator').manageMenus),
  validateConfigureReservationPolicies: validateRequest(require('@validators/admin/mtables/merchantValidator').configureReservationPoliciesPolicies),
  validateMonitorBranchPerformance: validateRequest(require('@validators/admin/mtables/merchantValidator').monitorBranchPerformance),
  checkManageMerchantPermission: checkPermission(merchantConstants.PERMISSIONS.MANAGE_MERCHANTS),
};