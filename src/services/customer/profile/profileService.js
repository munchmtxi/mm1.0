'use strict';

const fs = require('fs').promises;
const path = require('path');
const { User, Customer, Address, UserConnections, Role } = require('@models');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const logger = require('@utils/logger');
const tokenService = require('@services/common/tokenService');
const mapService = require('@services/common/mapService');
const imageService = require('@services/common/imageService');
const { sequelize } = require('@models');
const { PROFILE } = require('@constants/customer/profileConstants');

const fetchUserAndCustomer = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Customer, as: 'customer_profile' }],
  });
  const customer = user?.customer_profile;
  if (!user || !customer) {
    throw new AppError('User or customer profile not found', 404, 'PROFILE_NOT_FOUND');
  }
  return { user, customer };
};

const getProfile = async (userId) => {
  // Updated getProfile: Removed any UserConnections include.
  const user = await User.findByPk(userId, {
    include: [
      { 
        model: Customer, 
        as: 'customer_profile', 
        include: [{ model: Address, as: 'defaultAddress' }] 
      },
      {
        model: Address,
        as: 'addresses',
        where: { user_id: userId },
        required: false,
      },
    ],
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

// Updated updateProfile for better error handling.
const updateProfile = async (userId, updates) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);
    await user.update(updates, { validate: true });
    return user;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new AppError('Validation failed', 400, 'VALIDATION_FAILED', error.errors.map(e => e.message));
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Phone number already in use', 400, 'DUPLICATE_PHONE');
    }
    throw error;
  }
};

const changePassword = async (userId, currentPassword, newPassword) => {
  logger.info('Changing customer password', { userId });

  const user = await User.scope(null).findByPk(userId, {
    attributes: ['id', 'password'],
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  if (!user.password) throw new AppError('Password data unavailable', 500, 'PASSWORD_UNAVAILABLE');

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });

  await tokenService.logoutUser(userId, null, true);

  logger.info('Password changed', { userId });
  return true;
};

const managePaymentMethods = async (userId, action, paymentMethod) => {
  const { customer } = await fetchUserAndCustomer(userId);
  let payment_methods = customer.payment_methods || [];

  return await sequelize.transaction(async (t) => {
    if (action === PROFILE.ACTIONS.PAYMENT.ADD) {
      if (!paymentMethod || !paymentMethod.type || !paymentMethod.details) {
        throw new AppError('Invalid payment method format', 400, 'INVALID_PAYMENT_METHOD');
      }
      payment_methods.push({ ...paymentMethod, id: Date.now().toString() });
    } else if (action === PROFILE.ACTIONS.PAYMENT.REMOVE) {
      if (!paymentMethod?.id) {
        throw new AppError('Payment method ID required', 400, 'INVALID_PAYMENT_METHOD');
      }
      payment_methods = payment_methods.filter(pm => pm.id !== paymentMethod.id);
    } else if (action === PROFILE.ACTIONS.PAYMENT.SET_DEFAULT) {
      if (!paymentMethod?.id) {
        throw new AppError('Payment method ID required', 400, 'INVALID_PAYMENT_METHOD');
      }
      payment_methods = payment_methods.map(pm => ({
        ...pm,
        isDefault: pm.id === paymentMethod.id,
      }));
    } else {
      throw new AppError('Invalid action', 400, 'INVALID_ACTION');
    }

    customer.payment_methods = payment_methods;
    await customer.save({ transaction: t });

    logger.info('Payment methods updated', { userId, action });
    return payment_methods;
  });
};

// Updated manageFriends to avoid using UserConnections.
// Potential friend logic could be implemented by storing friend data in a JSON field or separate table.
const manageFriends = async (userId, action, friendId) => {
  const user = await User.findByPk(userId);
  const friend = await User.findByPk(friendId);
  if (!user || !friend) throw new AppError('User or friend not found', 404);
  // Implement friend logic without UserConnections.
  return { userId, friendId, action };
};

const manageAddresses = async (userId, action, addressData) => {
  const { customer } = await fetchUserAndCustomer(userId);

  return await sequelize.transaction(async (t) => {
    if (action === PROFILE.ACTIONS.ADDRESS.ADD) {
      let resolvedLocation;
      try {
        resolvedLocation = await mapService.resolveLocation(addressData);
      } catch (error) {
        logger.error('Address resolution failed', { userId, error: error.message });
        throw new AppError('Failed to resolve address', 400, 'ADDRESS_RESOLUTION_FAILED');
      }

      const { placeId, formattedAddress, latitude, longitude, components, countryCode } = resolvedLocation;

      let address = await Address.findOne({
        where: { placeId, user_id: userId },
        transaction: t,
      });

      if (!address) {
        address = await Address.create({
          user_id: userId,
          placeId,
          formattedAddress,
          latitude,
          longitude,
          components,
          countryCode,
          validationStatus: 'PENDING',
        }, { transaction: t });
      }

      if (!customer.default_address_id) {
        customer.default_address_id = address.id;
        await customer.save({ transaction: t });
      }

      logger.info('Address added', { userId, addressId: address.id });
      return address;
    } else if (action === PROFILE.ACTIONS.ADDRESS.REMOVE) {
      const addressId = addressData.id;
      const address = await Address.findByPk(addressId, { transaction: t });
      if (!address) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
      if (address.user_id !== userId) throw new AppError('Unauthorized to remove this address', 403, 'ADDRESS_UNAUTHORIZED');

      await Address.destroy({ where: { id: addressId }, transaction: t });

      if (customer.default_address_id === addressId) {
        const remainingAddresses = await Address.findAll({
          where: { user_id: userId },
          transaction: t,
        });
        customer.default_address_id = remainingAddresses.length > 0 ? remainingAddresses[0].id : null;
        await customer.save({ transaction: t });
      }

      logger.info('Address removed', { userId, addressId });
      return null;
    } else if (action === PROFILE.ACTIONS.ADDRESS.SET_DEFAULT) {
      const addressId = addressData.id;
      const address = await Address.findByPk(addressId, { transaction: t });
      if (!address) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
      if (address.user_id !== userId) throw new AppError('Unauthorized to set this address as default', 403, 'ADDRESS_UNAUTHORIZED');

      customer.default_address_id = addressId;
      await customer.save({ transaction: t });

      logger.info('Default address set', { userId, addressId });
      return address;
    } else {
      throw new AppError('Invalid action', 400, 'INVALID_ACTION');
    }
  });
};

// Updated updateProfilePicture to check the uploads directory and handle file writes directly.
const updateProfilePicture = async (userId, file) => {
  if (!file) throw new AppError('No file uploaded', 400);
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);
  const uploadPath = path.join(__dirname, '../../../uploads/customer', `${userId}_${Date.now()}${path.extname(file.originalname)}`);
  await fs.writeFile(uploadPath, file.buffer);
  const avatarUrl = `/uploads/customer/${path.basename(uploadPath)}`;
  await user.update({ avatar_url: avatarUrl });
  return avatarUrl;
};

const deleteProfilePicture = async (userId) => {
  const { user } = await fetchUserAndCustomer(userId);

  return await sequelize.transaction(async (t) => {
    if (!user.avatar_url) {
      throw new AppError('No profile picture to delete', 400, 'NO_PROFILE_PICTURE');
    }

    try {
      await imageService.deleteImage(userId, 'avatar');
      user.avatar_url = null;
      await user.save({ transaction: t });
      logger.info('Profile picture deleted', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete profile picture', { userId, error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to delete profile picture', 500, 'PROFILE_PICTURE_DELETE_FAILED', error.message);
    }
  });
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  managePaymentMethods,
  manageFriends,
  manageAddresses,
  updateProfilePicture,
  deleteProfilePicture,
};
