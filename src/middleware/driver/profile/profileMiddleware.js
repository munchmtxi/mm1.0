'use strict';

const multer = require('multer');
const driverConstants = require('@constants/driverConstants');
const AppError = require('@utils/AppError');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new AppError('Invalid file type', 400, driverConstants.ERROR_CODES.INVALID_FILE_DATA));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

const uploadCertificationFile = upload.single('file');

module.exports = {
  uploadCertificationFile,
};