'use strict';

const passport = require('passport');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const authConstants = require('@constants/common/authConstants');
const catchAsync = require('@utils/catchAsync');

const authenticate = passport.authenticate('jwt', { session: false });

const restrictTo = (...roles) => {
  return catchAsync(async (req, res, next) => {
    if (!req.user) {
      logger.logWarnEvent('No user found in request', {
        userId: req.user?.id,
      });
      throw new AppError('Unauthorized', 401, 'USER_NOT_FOUND');
    }
    
    if (!roles.includes(req.user.role)) {
      logger.logWarnEvent('Role unauthorized', {
        userId: req.user?.id,
        role: req.user?.role,
      });
      throw new AppError('Forbidden', 403, 'UNAUTHORIZED_ROLE');
    }
    
    next();
  });
};

module.exports = { authenticate, restrictTo };