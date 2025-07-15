'use strict';

const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const localizationConstants = require('@constants/common/localizationConstants');

/** Checks user permissions for table search */
const checkPermissions = async (req, res, next) => {
  const { user } = req;
  if (!user || user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      error: formatMessage('customer', 'tables', user?.preferred_language || localizationConstants.DEFAULT_LANGUAGE, 'errors.INVALID_PERMISSIONS'),
    });
  }
  next();
};

module.exports = { checkPermissions };