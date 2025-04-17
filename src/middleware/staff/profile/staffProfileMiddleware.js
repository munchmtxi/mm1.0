'use strict';
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { restrictTo } = require('@middleware/common/authMiddleware');
const catchAsync = require('@utils/catchAsync');
const staffProfileValidator = require('@validators/staff/profile/staffProfileValidator');

// Access Joi validation schemas
const { updatePersonalInfo, changePassword } = staffProfileValidator;

// Authorization middleware
exports.validateStaff = restrictTo('staff', 'merchant', 'admin');
exports.validateMerchantOrAdmin = restrictTo('merchant', 'admin');

// Validation for personal info with Joi and catchAsync
exports.validatePersonalInfo = catchAsync(async (req, res, next) => {
  const { error, value } = updatePersonalInfo.validate(req.body, { abortEarly: false });
  if (error) {
    const message = 'Validation failed: ' + error.details.map(e => e.message).join(', ');
    logger.error('Personal info validation failed', { error: message });
    return next(new AppError(message, 400, 'VALIDATION_FAILED'));
  }
  req.validatedData = value;
  next();
});

// Validation for password change with Joi and catchAsync
exports.validatePasswordChange = catchAsync(async (req, res, next) => {
  const { error, value } = changePassword.validate(req.body, { abortEarly: false });
  if (error) {
    const message = 'Validation failed: ' + error.details.map(e => e.message).join(', ');
    logger.error('Password change validation failed', { error: message });
    return next(new AppError(message, 400, 'VALIDATION_FAILED'));
  }
  req.validatedData = value;
  next();
});
