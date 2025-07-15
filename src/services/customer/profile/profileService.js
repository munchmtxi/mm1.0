'use strict';

const { sequelize, Customer, User, AccessibilitySettings, Address } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { validatePhone } = require('@utils/validation');

async function updateProfile(userId, profileData, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, include: [{ model: User, as: 'user' }], transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  const { phone_number, address } = profileData;
  if (phone_number && !validatePhone(phone_number)) {
    throw new AppError('Invalid phone number', 400, customerConstants.ERROR_CODES[0]);
  }

  const updatedFields = {
    phone_number: phone_number || customer.phone_number,
    address: address || customer.address,
    updated_at: new Date(),
  };

  await customer.update(updatedFields, { transaction });
  logger.info('Customer profile updated', { customerId: customer.id });
  return { customerId: customer.id, updatedFields };
}

async function setCountry(userId, country, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  if (!customerConstants.CUSTOMER_SETTINGS.SUPPORTED_COUNTRIES.includes(country)) {
    throw new AppError('Unsupported country', 400, customerConstants.ERROR_CODES[0]);
  }

  const updatedFields = {
    country,
    updated_at: new Date(),
  };

  await customer.update(updatedFields, { transaction });
  logger.info('Customer country set', { customerId: customer.id, country });
  return { customerId: customer.id, country };
}

async function setLanguage(userId, languageCode, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, include: [{ model: User, as: 'user' }], transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  if (!customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES.includes(languageCode)) {
    throw new AppError('Invalid language', 400, customerConstants.ERROR_CODES[0]);
  }

  await customer.user.update({ preferred_language: languageCode, updated_at: new Date() }, { transaction });
  logger.info('Customer language set', { customerId: customer.id, languageCode });
  return { customerId: customer.id, languageCode };
}

async function setDietaryPreferences(userId, preferences, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  if (!preferences.every(pref => customerConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new AppError('Invalid dietary filter', 400, customerConstants.ERROR_CODES[12]);
  }

  await customer.update({ preferences, updated_at: new Date() }, { transaction });
  logger.info('Customer dietary preferences set', { customerId: customer.id });
  return { customerId: customer.id, preferences };
}

async function setDefaultAddress(userId, addressId, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  const address = await Address.findByPk(addressId, { transaction });
  if (!address || address.user_id !== userId) {
    throw new AppError('Invalid address', 400, customerConstants.ERROR_CODES[0]);
  }

  await customer.update({ default_address_id: addressId, address: address.formattedAddress, updated_at: new Date() }, { transaction });
  logger.info('Customer default address set', { customerId: customer.id, addressId });
  return { customerId: customer.id, default_address_id: addressId, address: address.formattedAddress };
}

async function getProfile(userId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: userId },
    attributes: ['id', 'user_id', 'phone_number', 'address', 'country', 'preferences', 'payment_methods', 'saved_addresses', 'default_address_id', 'created_at', 'updated_at'],
    include: [
      { model: AccessibilitySettings, attributes: ['screenReaderEnabled', 'fontSize', 'language'] },
      { model: Address, as: 'defaultAddress', attributes: ['id', 'formattedAddress', 'placeId', 'latitude', 'longitude'] },
      { model: User, as: 'user', attributes: ['first_name', 'last_name', 'email', 'preferred_language'] },
    ],
    transaction,
  });

  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  logger.info('Customer profile retrieved', { customerId: customer.id });
  return customer;
}

module.exports = { updateProfile, setCountry, setLanguage, setDietaryPreferences, setDefaultAddress, getProfile };