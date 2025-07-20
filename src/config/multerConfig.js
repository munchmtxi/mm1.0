// C:\Users\munch\Desktop\MMFinale\System\Back\MM1.0\src\config\multerConfig.js
'use strict';

const multer = require('multer');
const logger = require('@utils/logger');
const path = require('path');
const fs = require('fs').promises;
const uploadConstants = require('@constants/common/uploadConstants');

const uploadDir = path.join(__dirname, '..', 'Uploads', 'temp');

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
    bufferLength: file?.buffer?.length,
  });

  if (!file) {
    logger.error('No file provided to fileFilter');
    return cb(null, false);
  }

  const allowedMimeTypes = [
    ...uploadConstants.MIME_TYPES.IMAGES,
    ...uploadConstants.MIME_TYPES.VIDEOS,
    ...uploadConstants.MIME_TYPES.DOCUMENTS,
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn('Unsupported file type', { mimetype: file.mimetype });
    cb(null, false);
  }
};

const limits = {
  fileSize: uploadConstants.UPLOAD_LIMITS.MAX_FILE_SIZE, // 10MB
  files: Math.max(...Object.values(uploadConstants.UPLOAD_LIMITS.MAX_FILES)), // 10
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = upload;