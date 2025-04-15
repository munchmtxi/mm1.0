'use strict';

const multer = require('multer');
const logger = require('@utils/logger');
const path = require('path');
const fs = require('fs').promises; // Add fs for directory creation

const uploadDir = path.join(__dirname, '..', 'uploads', 'temp'); // Use uppercase Uploads for consistency

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(err => {
  logger.error('Failed to create upload directory', { error: err.message });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  logger.debug('Multer fileFilter called', { 
    fieldname: file?.fieldname, 
    originalname: file?.originalname, 
    mimetype: file?.mimetype,
    fileKeys: file ? Object.keys(file) : null,
    hasBuffer: !!file?.buffer,
    bufferLength: file?.buffer?.length
  });

  if (!file) {
    logger.error('No file provided to fileFilter');
    return cb(null, false);
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('Unsupported file type', { mimetype: file.mimetype });
    cb(null, false);
  }
};

const limits = {
  fileSize: 5 * 1024 * 1024,
  files: 2,
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = upload;