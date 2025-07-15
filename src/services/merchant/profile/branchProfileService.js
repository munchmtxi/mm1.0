'use strict';

const { sequelize, Merchant, MerchantBranch, User } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const localizationConstants = require('@constants/common/localizationConstants');
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

async function getAllowedSettings(merchantId) {
  const merchant = await Merchant.findByPk(merchantId);
  if (!merchant || !merchant.merchant_types || !merchant.merchant_types.length) {
    return {
      services: merchantConstants.BUSINESS_SETTINGS.DEFAULT_SERVICES,
      tasks: merchantConstants.BUSINESS_SETTINGS.DEFAULT_TASKS,
      bookings: merchantConstants.BUSINESS_SETTINGS.DEFAULT_BOOKINGS_ENABLED,
      delivery: merchantConstants.BUSINESS_SETTINGS.DEFAULT_DELIVERY_ENABLED,
      pickup: merchantConstants.BUSINESS_SETTINGS.DEFAULT_PICKUP_ENABLED,
      ui: merchantConstants.BUSINESS_SETTINGS.DEFAULT_UI,
      typeSpecificSettings: {},
    };
  }

  const services = new Set(merchantConstants.BUSINESS_SETTINGS.DEFAULT_SERVICES);
  const tasks = new Set(merchantConstants.BUSINESS_SETTINGS.DEFAULT_TASKS);
  let bookings = merchantConstants.BUSINESS_SETTINGS.DEFAULT_BOOKINGS_ENABLED;
  let delivery = merchantConstants.BUSINESS_SETTINGS.DEFAULT_DELIVERY_ENABLED;
  let pickup = merchantConstants.BUSINESS_SETTINGS.DEFAULT_PICKUP_ENABLED;
  let ui = merchantConstants.BUSINESS_SETTINGS.DEFAULT_UI;
  const typeSpecificSettings = {};

  merchant.merchant_types.forEach(type => {
    const typeConstants = typeConstantsMap[type] || merchantConstants;
    typeConstants.BUSINESS_SETTINGS.services.forEach(s => services.add(s));
    typeConstants.BUSINESS_SETTINGS.tasks.forEach(t => tasks.add(t));
    bookings = bookings || typeConstants.BUSINESS_SETTINGS.bookings;
    delivery = delivery || typeConstants.BUSINESS_SETTINGS.delivery;
    pickup = pickup || typeConstants.BUSINESS_SETTINGS.pickup;
    ui = typeConstants.BUSINESS_SETTINGS.ui || ui;
    Object.assign(typeSpecificSettings, typeConstants[type.toUpperCase() + '_CONFIG'] || {});
  });

  return {
    services: Array.from(services),
    tasks: Array.from(tasks),
    bookings,
    delivery,
    pickup,
    ui,
    typeSpecificSettings,
  };
}

async function createBranch(merchantId, branchDetails) {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await Merchant.findByPk(merchantId, { include: [{ model: User, as: 'user' }], transaction });
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const { name, address, city, country, phone, email, businessHours } = branchDetails;
    if (!name || !address || !city || !country || !phone || !email) {
      throw new AppError('Missing required fields', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (!localizationConstants.SUPPORTED_COUNTRIES.includes(country)) {
      throw new AppError('Unsupported country', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (!localizationConstants.SUPPORTED_CITIES[country].includes(city)) {
      throw new AppError('Unsupported city', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      throw new AppError('Invalid phone number', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Invalid email', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (businessHours && (!businessHours.open || !businessHours.close)) {
      throw new AppError('Invalid business hours', 400, merchantConstants.ERROR_CODES[3]);
    }

    const allowedSettings = await getAllowedSettings(merchantId);
    const branchCount = await MerchantBranch.count({ where: { merchant_id: merchantId }, transaction });
    const maxBranches = merchant.merchant_types.reduce((max, type) => {
      const typeConstants = typeConstantsMap[type] || merchantConstants;
      return Math.max(max, typeConstants.BRANCH_SETTINGS.MAX_BRANCHES || merchantConstants.BRANCH_SETTINGS.DEFAULT_MAX_BRANCHES);
    }, merchantConstants.BRANCH_SETTINGS.DEFAULT_MAX_BRANCHES);
    if (branchCount >= maxBranches) {
      throw new AppError('Maximum branches exceeded', 400, merchantConstants.ERROR_CODES[0]);
    }

    const branch = await MerchantBranch.create(
      {
        merchant_id: merchantId,
        name,
        address,
        city,
        country,
        phone,
        email,
        business_hours: businessHours,
        services: allowedSettings.services,
        tasks: allowedSettings.tasks,
        bookings_enabled: allowedSettings.bookings,
        delivery_enabled: allowedSettings.delivery,
        pickup_enabled: allowedSettings.pickup,
        ui: allowedSettings.ui,
        type_specific_settings: allowedSettings.typeSpecificSettings,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      { transaction }
    );

    await transaction.commit();
    logger.info('Branch created', { merchantId, branchId: branch.id });
    return branch;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating branch', { error: error.message, merchantId });
    throw error;
  }
}

async function updateBranch(branchId, branchDetails) {
  const transaction = await sequelize.transaction();
  try {
    const branch = await MerchantBranch.findByPk(branchId, {
      include: [{ model: Merchant, as: 'merchant', include: [{ model: User, as: 'user' }] }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const { name, address, city, country, phone, email, businessHours, status } = branchDetails;
    if (country && !localizationConstants.SUPPORTED_COUNTRIES.includes(country)) {
      throw new AppError('Unsupported country', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (city && country && !localizationConstants.SUPPORTED_CITIES[country]?.includes(city)) {
      throw new AppError('Unsupported city', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      throw new AppError('Invalid phone number', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('Invalid email', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (businessHours && (!businessHours.open || !businessHours.close)) {
      throw new AppError('Invalid business hours', 400, merchantConstants.ERROR_CODES[3]);
    }
    if (status && !['active', 'inactive'].includes(status)) {
      throw new AppError('Invalid status', 400, merchantConstants.ERROR_CODES[3]);
    }

    const allowedSettings = await getAllowedSettings(branch.merchant_id);
    const updatedFields = {
      name: name || branch.name,
      address: address || branch.address,
      city: city || branch.city,
      country: country || branch.country,
      phone: phone || branch.phone,
      email: email || branch.email,
      business_hours: businessHours || branch.business_hours,
      services: allowedSettings.services,
      tasks: allowedSettings.tasks,
      bookings_enabled: allowedSettings.bookings,
      delivery_enabled: allowedSettings.delivery,
      pickup_enabled: allowedSettings.pickup,
      ui: allowedSettings.ui,
      type_specific_settings: allowedSettings.typeSpecificSettings,
      status: status || branch.status,
      updated_at: new Date(),
    };

    await branch.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Branch updated', { branchId });
    return branch;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating branch', { error: error.message, branchId });
    throw error;
  }
}

async function deleteBranch(branchId) {
  const transaction = await sequelize.transaction();
  try {
    const branch = await MerchantBranch.findByPk(branchId, {
      include: [{ model: Merchant, as: 'merchant', include: [{ model: User, as: 'user' }] }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    await branch.destroy({ transaction });
    await transaction.commit();
    logger.info('Branch deleted', { branchId });
    return { branchId };
  } catch (error) {
    await transaction.rollback();
    logger.error('Error deleting branch', { error: error.message, branchId });
    throw error;
  }
}

async function listBranches(merchantId) {
  try {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const branches = await MerchantBranch.findAll({
      where: { merchant_id: merchantId },
      attributes: [
        'id',
        'name',
        'address',
        'city',
        'country',
        'phone',
        'email',
        'business_hours',
        'services',
        'tasks',
        'bookings_enabled',
        'delivery_enabled',
        'pickup_enabled',
        'ui',
        'type_specific_settings',
        'status',
        'created_at',
        'updated_at',
      ],
    });

    logger.info('Branches retrieved', { merchantId, branchCount: branches.length });
    return branches;
  } catch (error) {
    logger.error('Error listing branches', { error: error.message, merchantId });
    throw error;
  }
}

async function updateBranchSettings(branchId, settings) {
  const transaction = await sequelize.transaction();
  try {
    const branch = await MerchantBranch.findByPk(branchId, {
      include: [{ model: Merchant, as: 'merchant', include: [{ model: User, as: 'user' }] }],
      transaction,
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const allowedSettings = await getAllowedSettings(branch.merchant_id);
    const { services, tasks, bookingsEnabled, deliveryEnabled, pickupEnabled, ui, typeSpecificSettings } = settings;

    if (services && services.some(s => !allowedSettings.services.includes(s))) {
      throw new AppError('Invalid services for merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }
    if (tasks && tasks.some(t => !allowedSettings.tasks.includes(t))) {
      throw new AppError('Invalid tasks for merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }
    if (bookingsEnabled !== undefined && bookingsEnabled && !allowedSettings.bookings) {
      throw new AppError('Bookings not enabled for merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }
    if (deliveryEnabled !== undefined && deliveryEnabled && !allowedSettings.delivery) {
      throw new AppError('Delivery not enabled for merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }
    if (pickupEnabled !== undefined && pickupEnabled && !allowedSettings.pickup) {
      throw new AppError('Pickup not enabled for merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }
    if (ui && ui !== allowedSettings.ui) {
      throw new AppError('Invalid UI for merchant types', 400, merchantConstants.ERROR_CODES[0]);
    }

    const updatedFields = {
      services: services || branch.services,
      tasks: tasks || branch.tasks,
      bookings_enabled: bookingsEnabled !== undefined ? bookingsEnabled : branch.bookings_enabled,
      delivery_enabled: deliveryEnabled !== undefined ? deliveryEnabled : branch.delivery_enabled,
      pickup_enabled: pickupEnabled !== undefined ? pickupEnabled : branch.pickup_enabled,
      ui: ui || branch.ui,
      type_specific_settings: typeSpecificSettings || branch.type_specific_settings,
      updated_at: new Date(),
    };

    await branch.update(updatedFields, { transaction });
    await transaction.commit();
    logger.info('Branch settings updated', { branchId });
    return branch;
  } catch (error) {
    await transaction.rollback();
    logger.error('Error updating branch settings', { error: error.message, branchId });
    throw error;
  }
}

module.exports = {
  createBranch,
  updateBranch,
  deleteBranch,
  listBranches,
  updateBranchSettings,
};