'use strict';

const { User, Driver, Address, Route } = require('@models');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const logger = require('@utils/logger');
const libphonenumber = require('google-libphonenumber');
const imageService = require('@services/common/imageService');
const mapService = require('@services/common/mapService');
const tokenService = require('@services/common/tokenService');
const { sequelize } = require('@models');
const { ACTIONS } = require('@constants/driver/profileConstants');

const fetchUserAndDriver = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Driver, as: 'driver_profile' }],
  });
  const driver = user?.driver_profile;
  if (!user || !driver) {
    throw new AppError('User or driver profile not found', 404, 'PROFILE_NOT_FOUND');
  }
  return { user, driver };
};

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      { model: Driver, as: 'driver_profile', include: [{ model: Route, as: 'activeRoute' }] },
      { model: Address, as: 'addresses', where: { user_id: userId }, required: false },
    ],
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  return user;
};

const updatePersonalInfo = async (userId, updateData) => {
  const { first_name, last_name, email, phone } = updateData;
  const { user, driver } = await fetchUserAndDriver(userId);
  const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

  if (phone && phone !== user.phone) {
    try {
      const number = phoneUtil.parse(phone);
      if (!phoneUtil.isValidNumber(number)) {
        throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE');
      }
      const existingUser = await User.findOne({ where: { phone } });
      if (existingUser && existingUser.id !== user.id) {
        throw new AppError('Phone number already in use', 400, 'DUPLICATE_PHONE');
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Invalid phone number format', 400, 'INVALID_PHONE');
    }
  }

  const userUpdates = {
    first_name: first_name || user.first_name,
    last_name: last_name || user.last_name,
    email: email || user.email,
    phone: phone || user.phone,
  };

  const driverUpdates = {
    name: `${userUpdates.first_name} ${userUpdates.last_name}`,
    phone_number: phone || driver.phone_number,
  };

  await sequelize.transaction(async (t) => {
    await user.update(userUpdates, { transaction: t });
    await driver.update(driverUpdates, { transaction: t });
  });

  logger.info('Driver personal info updated', { userId, updatedFields: Object.keys(updateData) });
  return { user, driver };
};

const updateVehicleInfo = async (userId, vehicleData) => {
  const { driver } = await fetchUserAndDriver(userId);
  const { type, model, year } = vehicleData;

  const updatedVehicleInfo = {
    type: type || driver.vehicle_info.type,
    model: model || driver.vehicle_info.model,
    year: year || driver.vehicle_info.year,
  };

  await driver.update({ vehicle_info: updatedVehicleInfo });

  logger.info('Driver vehicle info updated', { userId });
  return driver;
};

const changePassword = async (userId, currentPassword, newPassword) => {
  logger.info('Changing driver password', { userId });

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

const updateProfilePicture = async (userId, file) => {
  if (!file) throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
  const { driver } = await fetchUserAndDriver(userId);

  return await sequelize.transaction(async (t) => {
    const profilePictureUrl = await imageService.uploadImage(userId, file, 'driver_profile');
    await driver.update({ profile_picture_url: profilePictureUrl }, { transaction: t });
    logger.info('Driver profile picture updated', { userId });
    return profilePictureUrl;
  });
};

const deleteProfilePicture = async (userId) => {
  const { driver } = await fetchUserAndDriver(userId);

  return await sequelize.transaction(async (t) => {
    if (!driver.profile_picture_url) {
      throw new AppError('No profile picture to delete', 400, 'NO_PROFILE_PICTURE');
    }
    await imageService.deleteImage(userId, 'driver_profile');
    await driver.update({ profile_picture_url: null }, { transaction: t });
    logger.info('Driver profile picture deleted', { userId });
    return true;
  });
};

const updateLicensePicture = async (userId, file) => {
  if (!file) throw new AppError('No file uploaded', 400, 'NO_FILE_UPLOADED');
  const { driver } = await fetchUserAndDriver(userId);

  return await sequelize.transaction(async (t) => {
    const licensePictureUrl = await imageService.uploadImage(userId, file, 'driver_license');
    await driver.update({ license_picture_url: licensePictureUrl }, { transaction: t });
    logger.info('Driver license picture updated', { userId });
    return licensePictureUrl;
  });
};

const deleteLicensePicture = async (userId) => {
  const { driver } = await fetchUserAndDriver(userId);

  return await sequelize.transaction(async (t) => {
    if (!driver.license_picture_url) {
      throw new AppError('No license picture to delete', 400, 'NO_LICENSE_PICTURE');
    }
    await imageService.deleteImage(userId, 'driver_license');
    await driver.update({ license_picture_url: null }, { transaction: t });
    logger.info('Driver license picture deleted', { userId });
    return true;
  });
};

const manageAddresses = async (userId, action, addressData) => {
  const { driver } = await fetchUserAndDriver(userId);

  return await sequelize.transaction(async (t) => {
    if (action === ACTIONS.ADDRESS.ADD) {
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

      logger.info('Address added', { userId, addressId: address.id });
      return address;
    } else if (action === ACTIONS.ADDRESS.REMOVE) {
      const addressId = addressData.id;
      const address = await Address.findByPk(addressId, { transaction: t });
      if (!address) throw new AppError('Address not found', 404, 'ADDRESS_NOT_FOUND');
      if (address.user_id !== userId) throw new AppError('Unauthorized to remove this address', 403, 'ADDRESS_UNAUTHORIZED');

      await Address.destroy({ where: { id: addressId }, transaction: t });
      logger.info('Address removed', { userId, addressId });
      return null;
    } else {
      throw new AppError('Invalid action', 400, 'INVALID_ACTION');
    }
  });
};

module.exports = {
  getProfile,
  updatePersonalInfo,
  updateVehicleInfo,
  changePassword,
  updateProfilePicture,
  deleteProfilePicture,
  updateLicensePicture,
  deleteLicensePicture,
  manageAddresses,
};