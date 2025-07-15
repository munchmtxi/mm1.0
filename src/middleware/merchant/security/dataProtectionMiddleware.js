'use strict';

const { authenticate, restrictTo, checkPermissions } = require('@middleware/common/authMiddleware');
const gamificationConstants = require('@constants/common/gamificationConstants');

const dataProtectionAuth = (action) => (req, res, next) => {
  authenticate(req, res, (err) => {
    if (err) return next(err);
    restrictTo(['merchant'])(req, res, (err) => {
      if (err) return next(err);
      checkPermissions(action)(req, res, next);
    });
  });
};

const encryptSensitiveDataAuth = dataProtectionAuth('dataEncrypted');
const complyWithRegulationsAuth = dataProtectionAuth('gdprEnforced');
const restrictDataAccessAuth = dataProtectionAuth('dataAccessManaged');
const auditDataSecurityAuth = dataProtectionAuth('complianceAudited');

module.exports = {
  encryptSensitiveDataAuth,
  complyWithRegulationsAuth,
  restrictDataAccessAuth,
  auditDataSecurityAuth,
};