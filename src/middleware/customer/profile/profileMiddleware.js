'use strict';

const multer = require('multer');
const path = require('path');
const { PROFILE } = require('@constants/customer/profileConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Address } = require('@models');
const catchAsync = require('@utils/catchAsync');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedTypes.includes(file.mimetype) || !['.jpg', '.jpeg', '.png'].includes(ext)) {
    cb(new AppError('Only JPG and PNG files are allowed', 400, PROFILE.ERRORS.INVALID_FILE_TYPE), false);
  } else if (file.size > 2 * 1024 * 1024) {
    cb(new AppError('File size exceeds 2MB limit', 400, PROFILE.ERRORS.FILE_TOO_LARGE), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
});

const uploadProfilePicture = upload.single('avatar');

const validateFriendAction = (req, res, next) => {
  const { action, friendId } = req.body;
  if (!action || !Object.values(PROFILE.ACTIONS.FRIEND).includes(action)) {
    throw new AppError(`Action must be one of: ${Object.values(PROFILE.ACTIONS.FRIEND).join(', ')}`, 400, 'INVALID_ACTION');
  }
  if (!friendId || !Number.isInteger(friendId) || friendId < 1) {
    throw new AppError('Friend ID must be a valid user ID', 400, 'INVALID_FRIEND_ID');
  }
  next();
};

const validateAddressAction = catchAsync(async (req, res, next) => {
  const { action, addressData } = req.body;
  if (!action || !Object.values(PROFILE.ACTIONS.ADDRESS).includes(action)) {
    throw new AppError(`Action must be one of: ${Object.values(PROFILE.ACTIONS.ADDRESS).join(', ')}`, 400, 'INVALID_ACTION');
  }
  if (action === PROFILE.ACTIONS.ADDRESS.ADD && (!addressData || typeof addressData !== 'object')) {
    throw new AppError('Address data is required for add action', 400, 'INVALID_ADDRESS_DATA');
  }
  if ([PROFILE.ACTIONS.ADDRESS.REMOVE, PROFILE.ACTIONS.ADDRESS.SET_DEFAULT].includes(action)) {
    if (!addressData?.id || !Number.isInteger(addressData.id) || addressData.id < 1) {
      throw new AppError('Address ID is required for remove or setDefault actions', 400, 'INVALID_ADDRESS_ID');
    }
    const address = await Address.findByPk(addressData.id);
    if (!address || address.user_id !== req.user.id) {
      throw new AppError('Unauthorized to access this address', 403, 'ADDRESS_UNAUTHORIZED');
    }
  }
  next();
});

const validatePaymentAction = (req, res, next) => {
  const { action, paymentMethod } = req.body;
  if (!action || !Object.values(PROFILE.ACTIONS.PAYMENT).includes(action)) {
    throw new AppError(`Action must be one of: ${Object.values(PROFILE.ACTIONS.PAYMENT).join(', ')}`, 400, 'INVALID_ACTION');
  }
  if (action === PROFILE.ACTIONS.PAYMENT.ADD && (!paymentMethod || !paymentMethod.type || !paymentMethod.details)) {
    throw new AppError('Payment method is required for add action', 400, 'INVALID_PAYMENT_METHOD');
  }
  if ([PROFILE.ACTIONS.PAYMENT.REMOVE, PROFILE.ACTIONS.PAYMENT.SET_DEFAULT].includes(action) &&
      (!paymentMethod?.id)) {
    throw new AppError('Payment method ID is required for remove or setDefault actions', 400, 'INVALID_PAYMENT_METHOD');
  }
  next();
};

module.exports = {
  uploadProfilePicture,
  validateFriendAction,
  validateAddressAction,
  validatePaymentAction,
};