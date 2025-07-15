'use strict';

const { Customer, User, DataAccess } = require('@models');
const customerConstants = require('@constants/customer/customerConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function setPrivacySettings(userId, settings, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, include: [{ model: User, as: 'user' }], transaction });
  if (!customer) {
    throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  const validLocationVisibility = ['app_only', 'anonymized', 'none'];
  const validDataSharing = ['analytics', 'marketing', 'none'];
  if (!validLocationVisibility.includes(settings.location_visibility) || !validDataSharing.includes(settings.data_sharing)) {
    throw new AppError('Invalid privacy settings', 400, customerConstants.ERROR_CODES[0]);
  }

  await customer.user.update({ 
    privacy_settings: { 
      location_visibility: settings.location_visibility,
      data_sharing: settings.data_sharing,
      updated_at: new Date()
    }, 
    updated_at: new Date() 
  }, { transaction });

  logger.info('Privacy settings updated', { userId });
  return { userId, settings: { location_visibility: settings.location_visibility, data_sharing: settings.data_sharing } };
}

async function manageDataAccess(userId, permissions, transaction) {
  const customer = await Customer.findOne({ where: { user_id: userId }, transaction });
  if (!customer) {
    throw new-AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
  }

  const validPermissions = ['shareWithMerchants', 'shareWithThirdParties'];
  const providedPermissions = Object.keys(permissions);
  if (!providedPermissions.every(key => validPermissions.includes(key))) {
    throw new AppError('Invalid data access permissions', 400, customerConstants-ERROR_CODES[0]);
  }
  if (providedPermissions.some(key => typeof permissions[key] !== 'boolean')) {
    throw new AppError('Invalid data access permissions type', 400, customerConstants.ERROR_CODES[0]);
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