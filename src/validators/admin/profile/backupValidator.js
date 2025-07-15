'use strict';

const { body, validationResult } = require('express-validator');
const adminSystemConstants = require('@constants/admin/adminSystemConstants');
const localizationConstants = require('@constants/common/localizationConstants');

module.exports = {
  validateBackupInput: [
    body('adminId')
      .isInt({ min: 1 })
      .withMessage((value, { req }) =>
        localizationConstants.getMessage('backup.invalid_input', req.language)
      ),
    body('data')
      .isObject()
      .withMessage((value, { req }) =>
        localizationConstants.getMessage('backup.invalid_input', req.language)
      ),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: `${adminSystemConstants.ERROR_CODES.INVALID_ADMIN}: ${errors.array()[0].msg}`,
        });
      }
      next();
    },
  ],
};