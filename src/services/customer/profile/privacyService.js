'use strict';

const { Customer, PrivacySettings, DataAccess } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function setPrivacySettings(userId, settings, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  const validSettings = ['anonymizeLocation', 'anonymizeProfile'];
  const providedSettings = Object.keys(settings);
  if (!providedSettings.every(key => validSettings.includes(key))) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_privacy_settings'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }
  if (providedSettings.some(key => typeof settings[key] !== 'boolean')) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_privacy_settings_type'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }

  let privacySettings = await PrivacySettings.findOne({ where: { user_id: userId }, transaction });
  if (privacySettings) {
    await privacySettings.update({ ...settings, updated_at: new Date() }, { transaction });
  } else {
    privacySettings = await PrivacySettings.create({
      user_id: userId,
      ...settings,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });
  }

  logger.info('Privacy settings updated', { userId });
  return { userId, settings: privacySettings };
}

async function manageDataAccess(userId, permissions, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.customer_not_found'),
      404,
      customerConstants.ERROR_CODES[1]
    );
  }

  const validPermissions = ['shareWithMerchants', 'shareWithThirdParties'];
  const providedPermissions = Object.keys(permissions);
  if (!providedPermissions.every(key => validPermissions.includes(key))) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_data_access_permissions'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }
  if (providedPermissions.some(key => typeof permissions[key] !== 'boolean')) {
    throw new AppError(
      formatMessage('customer', 'profile', customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE, 'error.invalid_data_access_permissions_type'),
      400,
      customerConstants.ERROR_CODES[0]
    );
  }

  let dataAccess = await DataAccess.findOne({ where: { user_id: userId }, transaction });
  if (dataAccess) {
    await dataAccess.update({ ...permissions, updated_at: new Date() }, { transaction });
  } else {
    dataAccess = await DataAccess.create({
      user_id: userId,
      ...permissions,
      created_at: new Date(),
      updated_at: new Date(),
    }, { transaction });
  }

  logger.info('Data access permissions updated', { userId });
  return { userId, permissions: dataAccess };
}

module.exports = { setPrivacySettings, manageDataAccess };