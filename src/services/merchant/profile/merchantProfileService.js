'use strict';

const { sequelize, Merchant, User } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');

const typeConstantsMap = {
  restaurant: restaurantConstants,
  parking_lot: parkingLotConstants,
  grocery: groceryConstants,
  dark_kitchen: darkKitchenConstants,
  caterer: catererConstants,
  cafe: cafeConstants,
  butcher: butcherConstants,
  bakery: bakeryConstants,
};

async function updateBusinessDetails(merchantId, details) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const { businessName, phone, businessHours, businessTypeDetails } = details;
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      throw new AppError('Invalid phone number', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (businessHours && (!businessHours.open || !businessHours.close)) {
      throw new AppError('Invalid business hours', 400, merchantConstants.ERROR_CODES[3]);
    }

    const updatedFields = {
      business_name: businessName || merchant.business_name,
      phone_number: phone || merchant.phone_number,
      business_hours: businessHours || merchant.business_hours,
      business_type_details: businessTypeDetails || merchant.business_type_details,
      updated_at: new Date(),
    };

    await merchant.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Merchant business details updated', { merchantId });
    return merchant;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating business details', { error: error.message });
    throw error;
  }
}

async function setCountrySettings(merchantId, country) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    if (!merchantConstants.SUPPORTED_COUNTRIES.includes(country)) {
      throw new AppError('Unsupported country', 400, merchantConstants.ERROR_CODES[3]);
    }

    const updatedFields = {
      currency: merchantConstants.COUNTRY_CURRENCY_MAP[country] || 'USD',
      updated_at: new Date(),
    };

    await merchant.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Merchant country settings updated', { merchantId, country });
    return merchant;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error setting country settings', { error: error.message });
    throw error;
  }
}

async function manageLocalization(merchantId, settings) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const { language } = settings;
    if (language && !['en', 'fr', 'es'].includes(language)) {
      throw new AppError('Invalid language', 400, merchantConstants.ERROR_CODES[3]);
    }

    const updatedFields = {
      preferred_language: language || merchant.preferred_language,
      updated_at: new Date(),
    };

    await merchant.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Merchant localization settings updated', { merchantId });
    return merchant;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error managing localization', { error: error.message });
    throw error;
  }
}

async function updateMerchantMedia(merchantId, { logoUrl, bannerUrl }) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const updatedFields = {
      logo_url: logoUrl || merchant.logo_url,
      banner_url: bannerUrl || merchant.banner_url,
      updated_at: new Date(),
    };

    await merchant.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Merchant media updated', { merchantId });
    return updatedFields;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating merchant media', { error: error.message });
    throw error;
  }
}

async function updateNotificationPreferences(merchantId, notificationPreferences) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const allowed = ['email', 'sms', 'push', 'whatsapp'];
    if (notificationPreferences && Object.keys(notificationPreferences).some(key => !allowed.includes(key))) {
      throw new AppError('Invalid notification preferences', 400, merchantConstants.ERROR_CODES[3]);
    }

    const updatedFields = {
      notification_preferences: notificationPreferences || merchant.notification_preferences,
      updated_at: new Date(),
    };

    await merchant.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Merchant notification preferences updated', { merchantId });
    return updatedFields;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating notification preferences', { error: error.message });
    throw error;
  }
}

async function updateMerchantTypes(merchantId, newMerchantTypes) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    if (!Array.isArray(newMerchantTypes) || !newMerchantTypes.every(type => merchantConstants.MERCHANT_TYPES.includes(type))) {
      throw new AppError('Invalid merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }

    const services = new Set(merchantConstants.BUSINESS_SETTINGS.DEFAULT_SERVICES);
    const tasks = new Set(merchantConstants.BUSINESS_SETTINGS.DEFAULT_TASKS);
    let bookings = merchantConstants.BUSINESS_SETTINGS.DEFAULT_BOOKINGS_ENABLED;
    let delivery = merchantConstants.BUSINESS_SETTINGS.DEFAULT_DELIVERY_ENABLED;
    let pickup = merchantConstants.BUSINESS_SETTINGS.DEFAULT_PICKUP_ENABLED;
    let ui = merchantConstants.BUSINESS_SETTINGS.DEFAULT_UI;
    const typeSpecificSettings = {};

    newMerchantTypes.forEach(type => {
      const typeConstants = typeConstantsMap[type] || merchantConstants;
      typeConstants.BUSINESS_SETTINGS.services.forEach(s => services.add(s));
      typeConstants.BUSINESS_SETTINGS.tasks.forEach(t => tasks.add(t));
      bookings = bookings || typeConstants.BUSINESS_SETTINGS.bookings;
      delivery = delivery || typeConstants.BUSINESS_SETTINGS.delivery;
      pickup = pickup || typeConstants.BUSINESS_SETTINGS.pickup;
      ui = typeConstants.BUSINESS_SETTINGS.ui || ui;
      Object.assign(typeSpecificSettings, typeConstants[type.toUpperCase() + '_CONFIG'] || {});
    });

    const updatedFields = {
      merchant_types: newMerchantTypes,
      services: Array.from(services),
      tasks: Array.from(tasks),
      bookings_enabled: bookings,
      delivery_enabled: delivery,
      pickup_enabled: pickup,
      ui,
      type_specific_settings: typeSpecificSettings,
      updated_at: new Date(),
    };

    await merchant.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Merchant types updated', { merchantId, merchantTypes: newMerchantTypes });
    return merchant;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating merchant types', { error: error.message });
    throw error;
  }
}

module.exports = {
  updateBusinessDetails,
  setCountrySettings,
  manageLocalization,
  updateMerchantMedia,
  updateNotificationPreferences,
  updateMerchantTypes,
};