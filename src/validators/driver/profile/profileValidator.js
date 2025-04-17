'use strict';

const { body } = require('express-validator');

exports.personalInfoValidator = [
  body('first_name').optional().isString().trim().isLength({ min: 2, max: 50 }),
  body('last_name').optional().isString().trim().isLength({ min: 2, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().trim(),
];

exports.vehicleInfoValidator = [
  body('type').optional().isString().trim(),
  body('model').optional().isString().trim(),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }),
];

exports.passwordChangeValidator = [
  body('currentPassword').isString().notEmpty(),
  body('newPassword')
    .isString()
    .isLength({ min: 8, max: 100 })
    .matches(/[A-Z]/, 'i')
    .matches(/[a-z]/, 'i')
    .matches(/[0-9]/)
    .matches(/[^A-Za-z0-9]/),
];

exports.addressValidator = [
  body('action').isString().isIn(['add_address', 'remove_address']),
  body('addressData.formattedAddress')
    .if(body('action').equals('add_address'))
    .notEmpty().withMessage('Formatted address is required'),
  body('addressData.id')
    .if(body('action').equals('remove_address'))
    .notEmpty().withMessage('Address ID is required'),
];