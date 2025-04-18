'use strict';

const AppError = require('@utils/AppError');
const adminConstants = require('@constants/admin/adminConstants');
const logger = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

const validateFileUpload = catchAsync(async (req, res, next) => {
  logger.debug('File upload middleware', { file: req.file });
  if (!req.file) {
    throw new AppError('No file uploaded', 400, adminConstants.ERROR_CODES.NO_FILE_UPLOADED);
  }
  const file = req.file;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError('Unsupported file format', 400, 'UNSUPPORTED_FILE_FORMAT');
  }
  if (file.size > maxSize) {
    throw new AppError('File size exceeds 5MB limit', 400, 'FILE_TOO_LARGE');
  }
  logger.info('File upload validated', { userId: req.user.id, filename: file.originalname });
  next();
});

module.exports = {
  validateFileUpload,
};