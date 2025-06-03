'use strict';

const { sequelize, Customer, User, AccessibilitySettings } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { validateEmail, validatePhone } = require('@utils/validation');

async function updateProfile(userId, profileData, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  const { name, email, phone } = profileData;
  if (email && !validateEmail(email)) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_email'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }
  if (phone && !validatePhone(phone)) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_phone'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }

  const updatedFields = {
    name: name || customer.name,
    email: email || customer.email,
    phone: phone || customer.phone,
    updated_at: new Date(),
  };

  await customer.update(updatedFields, { transaction });
  logger.info('Customer profile updated', { customerId: customer.id });
  return { customerId: customer.id, updatedFields };
}

async function setCountry(userId, countryCode, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  const supportedCountries = Object.keys(customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CITIES).flatMap(country =>
    customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CITIES[country].map(() => country)
  );
  if (!supportedCountries.includes(countryCode)) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.unsupported_country'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }

  const updatedFields = {
    country_code: countryCode,
    currency: customerConstants.CUSTOMER_SETTINGS.SUPPORTED_CURRENCIES.find(c => c === countryCode) || customerConstants.CUSTOMER_SETTINGS.DEFAULT_CURRENCY,
    updated_at: new Date(),
  };

  await customer.update(updatedFields, { transaction });
  logger.info('Customer country set', { customerId: customer.id, countryCode });
  return { customerId: customer.id, countryCode, currency: updatedFields.currency };
}

async function setLanguage(userId, languageCode, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  if (!customerConstants.CUSTOMER_SETTINGS.SUPPORTED_LANGUAGES.includes(languageCode)) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_language'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }

  await customer.update({ preferred_language: languageCode, updated_at: new Date() }, { transaction });
  logger.info('Customer language set', { customerId: customer.id, languageCode });
  return { customerId: customer.id, languageCode };
}

async function setDietaryPreferences(userId, preferences, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  if (!preferences.every(pref => customerConstants.ACCESSIBILITY_CONSTANTS.ALLOWED_DIETARY_FILTERS.includes(pref))) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_dietary_filter'),
      400,
      customerConstants.ERROR_CODES[11]
    );
  }

  await customer.update({ dietary_preferences: preferences, updated_at: new Date() }, { transaction });
  logger.info('Customer dietary preferences set', { customerId: customer.id });
  return { customerId: customer.id, preferences };
}

async function getProfile(userId, transaction) {
  const customer = await Customer.findOne({
    where: { user_id: userId },
    attributes: ['id', 'user_id', 'name', 'email', 'phone', 'preferred_language', 'country_code', 'currency', 'dietary_preferences', 'created_at', 'updated_at'],
    include: [
      { model: AccessibilitySettings, attributes: ['screenReaderEnabled', 'fontSize', 'language'] },
    ],
    transaction,
  });

  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  logger.info('Customer profile retrieved', { customerId: customer.id });
  return customer;
}

module.exports = { updateProfile, setCountry, setLanguage, setDietaryPreferences, getProfile };