'use strict';

const Joi = require('joi');
const paymentConstants = require('@constants/paymentConstants');
const { formatMessage } = require('@utils/localizationService');
const { AppError } = require('@utils/AppError');

function validateRequest(validationSchema) {
  return async (req, res, next) => {
    try {
      if (validationSchema.body) {
        await validationSchema.body.validateAsync(req.body, { abortEarly: false });
      }
      next();
    } catch (error) {
      next(new AppError(
        formatMessage('error.invalid_input'),
        400,
        paymentConstants.ERROR_CODES.INVALID_INPUT,
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
          paymentConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validateProcessPayment: validateRequest(require('@validators/admin/mtables/paymentValidator').processPayment),
  validateManageSplitPayments: validateRequest(require('@validators/admin/mtables/paymentValidator').manageSplitPayments),
  validateIssueRefund: validateRequest(require('@validators/admin/mtables/paymentValidator').issueRefund),
  checkManagePaymentsPermission: checkPermission(paymentConstants.PERMISSIONS.MANAGE_PAYMENTS),
};