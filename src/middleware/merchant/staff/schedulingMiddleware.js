// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\middleware\merchant\staff\schedulingMiddleware.js
'use strict';

const { validationResult } = require('express-validator');
const staffConstants = require('@constants/staff/staffConstants');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
}

module.exports = {
  validateRequest,
};