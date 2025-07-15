'use strict';

const Joi = require('joi');
const disputeConstants = require('@constants/disputeConstants');
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
        disputeConstants.ERROR_CODES.INVALID_INPUT,
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
          disputeConstants.ERROR_CODES.PERMISSION_DENIED
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validateResolveBookingDisputes: validateRequest(require('@validators/admin/mtables/disputeValidator').resolveBookingDisputes),
  validateResolvePreOrderDisputes: validateRequest(require('@validators/admin/mtables/disputeValidator').resolvePreOrderDisputes),
  validateTrackDisputeStatus: validateRequest(require('@validators/admin/mtables/disputeValidator').trackDisputeStatus),
  validateEscalateDisputes: validateRequest(require('@validators/admin/mtables/disputeValidator').escalateDisputes),
  checkManageDisputesPermission: checkPermission(disputeConstants.PERMISSIONS.MANAGE_DISPUTES),
};