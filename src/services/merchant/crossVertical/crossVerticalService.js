'use strict';

const { sequelize, User, Merchant, MerchantBranch, Order, InDiningOrder, Booking, ParkingBooking, Customer } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const driverConstants = require('@constants/driver/driverConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtxiConstants = require('@constants/common/mtxiConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const meventsConstants = require('@constants/common/meventsConstants');
const restaurantConstants = require('@constants/merchant/restaurantConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const groceryConstants = require('@constants/merchant/groceryConstants');
const darkKitchenConstants = require('@constants/merchant/darkKitchenConstants');
const catererConstants = require('@constants/merchant/catererConstants');
const cafeConstants = require('@constants/merchant/cafeConstants');
const butcherConstants = require('@constants/merchant/butcherConstants');
const bakeryConstants = require('@constants/merchant/bakeryConstants');
const complianceConstants = require('@constants/merchant/complianceConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function unifyServices(merchantId, ipAddress, transaction = null) {
  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id', 'business_name', 'currency', 'business_type'] }],
      transaction,
    });
    if (!merchant || !merchant.merchant_profile) {
      throw new AppError(merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'Invalid merchant type' : 'Merchant error', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({
      where: { merchant_id: merchant.merchant_profile.id },
      attributes: ['id', 'name', 'preferred_language', 'currency'],
      transaction,
    });
    if (!branches.length) {
      throw new AppError(merchantConstants.ERROR_CODES.includes('NO_BRANCHES') ? 'No branches found' : 'Branch error', 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
    }

    const merchantType = merchant.merchant_profile.business_type;
    const merchantConfigs = {
      restaurant: restaurantConstants,
      parking_lot: parkingLotConstants,
      grocery: groceryConstants,
      dark_kitchen: darkKitchenConstants,
      caterer: catererConstants,
      cafe: cafeConstants,
      butcher: butcherConstants,
      bakery: bakeryConstants,
    };
    const config = merchantConfigs[merchantType] || merchantConstants;

    const orders = await Order.count({
      where: { merchant_id: merchantId, status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes('pending') ? 'pending' : null },
      transaction,
    });
    const inDiningOrders = await InDiningOrder.count({
      where: { branch_id: branches.map(b => b.id), status: mtablesConstants.IN_DINING_STATUSES.includes('CONFIRMED') ? 'CONFIRMED' : null },
      transaction,
    });
    const bookings = await Booking.count({
      where: { merchant_id: merchantId, status: mtablesConstants.BOOKING_STATUSES.includes('PENDING') ? 'PENDING' : null },
      transaction,
    });
    const parkingBookings = await ParkingBooking.count({
      where: { merchant_id: merchantId, status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES.includes('PENDING') ? 'PENDING' : null },
      transaction,
    });

    for (const branch of branches) {
      await branch.update({
        payment_methods: {
          mtables: config.WALLET_CONSTANTS.PAYMENT_METHODS.includes('wallet'),
          munch: config.WALLET_CONSTANTS.PAYMENT_METHODS.includes('wallet'),
          mpark: config.WALLET_CONSTANTS.PAYMENT_METHODS.includes('wallet'),
          mtxi: config.WALLET_CONSTANTS.PAYMENT_METHODS.includes('wallet'),
          mevents: config.WALLET_CONSTANTS.PAYMENT_METHODS.includes('wallet'),
        },
        preferred_language: merchant.preferred_language || config.MUNCH_CONSTANTS?.MUNCH_SETTINGS?.DEFAULT_LANGUAGE || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
        currency: merchant.merchant_profile.currency || config.MUNCH_CONSTANTS?.MUNCH_SETTINGS?.DEFAULT_CURRENCY || mparkConstants.PARKING_CONFIG.DEFAULT_CURRENCY,
      }, { transaction });
    }

    logger.info(`Unified services for merchant ${merchantId} (${merchant.merchant_profile.business_name}): ${orders} orders, ${inDiningOrders} in-dining orders, ${bookings} bookings, ${parkingBookings} parking bookings`);
    return {
      merchantId,
      businessName: merchant.merchant_profile.business_name,
      merchantType,
      orders,
      inDiningOrders,
      bookings,
      parkingBookings,
      language: merchant.preferred_language || config.MUNCH_CONSTANTS?.MUNCH_SETTINGS?.DEFAULT_LANGUAGE || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      currency: merchant.merchant_profile.currency || config.MUNCH_CONSTANTS?.MUNCH_SETTINGS?.DEFAULT_CURRENCY || mparkConstants.PARKING_CONFIG.DEFAULT_CURRENCY,
      action: config.SUCCESS_MESSAGES.includes('order_processed') ? 'servicesUnified' : null,
    };
  } catch (error) {
    throw handleServiceError('unifyServices', error, complianceConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
  }
}

async function ensureConsistentUI(merchantId, ipAddress, transaction = null) {
  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language', 'notification_preferences'],
      include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id', 'business_name', 'preferred_language', 'logo_url', 'banner_url', 'business_type'] }],
      transaction,
    });
    if (!merchant || !merchant.merchant_profile) {
      throw new AppError(merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'Invalid merchant type' : 'Merchant error', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({
      where: { merchant_id: merchant.merchant_profile.id },
      attributes: ['id', 'name', 'preferred_language', 'currency'],
      transaction,
    });
    if (!branches.length) {
      throw new AppError(merchantConstants.ERROR_CODES.includes('NO_BRANCHES') ? 'No branches found' : 'Branch error', 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
    }

    const merchantType = merchant.merchant_profile.business_type;
    const merchantConfigs = {
      restaurant: restaurantConstants,
      parking_lot: parkingLotConstants,
      grocery: groceryConstants,
      dark_kitchen: darkKitchenConstants,
      caterer: catererConstants,
      cafe: cafeConstants,
      butcher: butcherConstants,
      bakery: bakeryConstants,
    };
    const config = merchantConfigs[merchantType] || merchantConstants;

    const uiSettings = {
      theme: customerConstants.CROSS_VERTICAL_CONSTANTS.UI_CONSISTENCY.THEME,
      colorScheme: customerConstants.CROSS_VERTICAL_CONSTANTS.UI_CONSISTENCY.COLOR_SCHEME,
      font: customerConstants.CROSS_VERTICAL_CONSTANTS.UI_CONSISTENCY.FONT_FAMILY,
      fontSize: config.ACCESSIBILITY_CONSTANTS.FONT_SIZE_RANGE,
      logoUrl: merchant.merchant_profile.logo_url,
      bannerUrl: merchant.merchant_profile.banner_url,
      uiType: config.BUSINESS_SETTINGS.ui,
    };

    for (const branch of branches) {
      await branch.update({
        preferred_language: merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
        currency: merchant.merchant_profile.currency || config.MUNCH_CONSTANTS?.MUNCH_SETTINGS?.DEFAULT_CURRENCY || mparkConstants.PARKING_CONFIG.DEFAULT_CURRENCY,
      }, { transaction });
    }

    await merchant.update({
      preferred_language: uiSettings.language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      notification_preferences: {
        ...merchant.notification_preferences,
        ui_update: config.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('payment_confirmation'),
      },
    }, { transaction });

    logger.info(`Ensured consistent UI for merchant ${merchantId} (${merchant.merchant_profile.business_name}): ${JSON.stringify(uiSettings)}`);
    return {
      merchantId,
      businessName: merchant.merchant_profile.business_name,
      merchantType,
      uiSettings,
      language: merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      action: config.SUCCESS_MESSAGES.includes('order_processed') ? 'uiEnsured' : null,
    };
  } catch (error) {
    throw handleServiceError('ensureConsistentUI', error, complianceConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
  }
}

async function unifyCustomerService(merchantId, customerId, ipAddress, transaction = null) {
  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Merchant, as: 'merchant_profile', attributes: ['id', 'business_name', 'currency', 'business_type'] }],
      transaction,
    });
    if (!merchant || !merchant.merchant_profile) {
      throw new AppError(merchantConstants.ERROR_CODES.includes('INVALID_MERCHANT_TYPE') ? 'Invalid merchant type' : 'Merchant error', 404, merchantConstants.ERROR_CODES.MERCHANT_NOT_FOUND);
    }

    const customer = await User.findByPk(customerId, {
      attributes: ['id', 'preferred_language'],
      include: [{ model: Customer, as: 'customer_profile', attributes: ['id', 'phone_number', 'dietary_preferences'] }],
      transaction,
    });
    if (!customer || !customer.customer_profile) {
      throw new AppError(customerConstants.ERROR_CODES.includes('INVALID_CUSTOMER') ? 'Invalid customer' : 'Customer error', 404, customerConstants.ERROR_CODES.CUSTOMER_NOT_FOUND);
    }

    const branches = await MerchantBranch.findAll({
      where: { merchant_id: merchant.merchant_profile.id },
      attributes: ['id', 'name'],
      transaction,
    });
    if (!branches.length) {
      throw new AppError(merchantConstants.ERROR_CODES.includes('NO_BRANCHES') ? 'No branches found' : 'Branch error', 404, merchantConstants.ERROR_CODES.BRANCH_NOT_FOUND);
    }

    const merchantType = merchant.merchant_profile.business_type;
    const merchantConfigs = {
      restaurant: restaurantConstants,
      parking_lot: parkingLotConstants,
      grocery: groceryConstants,
      dark_kitchen: darkKitchenConstants,
      caterer: catererConstants,
      cafe: cafeConstants,
      butcher: butcherConstants,
      bakery: bakeryConstants,
    };
    const config = merchantConfigs[merchantType] || merchantConstants;

    const serviceSettings = {
      mtables: {
        enabled: config.BUSINESS_SETTINGS.services.includes('mtables') && (
          merchantType === 'restaurant' ? restaurantConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.includes('pending') :
          merchantType === 'cafe' ? cafeConstants.MTABLES_CONSTANTS.BOOKING_STATUSES.includes('pending') : false
        ),
        dietaryFilters: customer.customer_profile.dietary_preferences?.filter(d => (
          merchantType === 'restaurant' ? restaurantConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'cafe' ? cafeConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) : []
        )) || [],
        maxGroupSize: merchantType === 'restaurant' ? restaurantConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE :
                       merchantType === 'cafe' ? cafeConstants.MTABLES_CONSTANTS.PRE_ORDER_SETTINGS.MAX_GROUP_SIZE : 0,
        ambianceTypes: merchantType === 'restaurant' ? restaurantConstants.BUSINESS_SETTINGS.RESTAURANT_CONFIG.AMBIANCE_TYPES :
                       merchantType === 'cafe' ? cafeConstants.BUSINESS_SETTINGS.CAFE_CONFIG.AMBIANCE_TYPES : [],
      },
      munch: {
        enabled: config.BUSINESS_SETTINGS.services.includes('munch') && (
          merchantType === 'restaurant' ? restaurantConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') :
          merchantType === 'grocery' ? groceryConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') :
          merchantType === 'dark_kitchen' ? darkKitchenConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') :
          merchantType === 'caterer' ? catererConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') :
          merchantType === 'cafe' ? cafeConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') :
          merchantType === 'butcher' ? butcherConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') :
          merchantType === 'bakery' ? bakeryConstants.MUNCH_CONSTANTS.ORDER_STATUSES.includes('pending') : false
        ),
        dietaryFilters: customer.customer_profile.dietary_preferences?.filter(d => (
          merchantType === 'restaurant' ? restaurantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'grocery' ? groceryConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'dark_kitchen' ? darkKitchenConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'caterer' ? catererConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'cafe' ? cafeConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'butcher' ? butcherConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) :
          merchantType === 'bakery' ? bakeryConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS.includes(d) : []
        )) || [],
        maxOrderItems: merchantType === 'restaurant' ? restaurantConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS :
                       merchantType === 'grocery' ? groceryConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS :
                       merchantType === 'dark_kitchen' ? darkKitchenConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS :
                       merchantType === 'caterer' ? catererConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS :
                       merchantType === 'cafe' ? cafeConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS :
                       merchantType === 'butcher' ? butcherConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS :
                       merchantType === 'bakery' ? bakeryConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.MAX_ORDER_ITEMS : 0,
        orderTypes: merchantType === 'restaurant' ? restaurantConstants.MUNCH_CONSTANTS.ORDER_TYPES :
                    merchantType === 'grocery' ? groceryConstants.MUNCH_CONSTANTS.ORDER_TYPES :
                    merchantType === 'dark_kitchen' ? darkKitchenConstants.MUNCH_CONSTANTS.ORDER_TYPES :
                    merchantType === 'caterer' ? catererConstants.MUNCH_CONSTANTS.ORDER_TYPES :
                    merchantType === 'cafe' ? cafeConstants.MUNCH_CONSTANTS.ORDER_TYPES :
                    merchantType === 'butcher' ? butcherConstants.MUNCH_CONSTANTS.ORDER_TYPES :
                    merchantType === 'bakery' ? bakeryConstants.MUNCH_CONSTANTS.ORDER_TYPES : [],
      },
      mtxi: {
        enabled: driverConstants.CROSS_VERTICAL_CONSTANTS.SERVICES.includes('mtxi'),
        rideTypes: mtxiConstants.RIDE_TYPES,
        maxPassengers: mtxiConstants.RIDE_CONFIG.MAX_ACTIVE_RIDES_PER_CUSTOMER,
      },
      mevents: {
        enabled: config.BUSINESS_SETTINGS.services.includes('mevents') && (
          merchantType === 'restaurant' ? restaurantConstants.MEVENTS_CONSTANTS.EVENT_STATUSES.includes('draft') :
          merchantType === 'caterer' ? catererConstants.MEVENTS_CONSTANTS.EVENT_STATUSES.includes('draft') : false
        ),
        dietaryFilters: customer.customer_profile.dietary_preferences?.filter(d => (
          merchantType === 'restaurant' ? restaurantConstants.MEVENTS_CONSTANTS.EVENT_SETTINGS.ALLOWED_DIETARY_FILTERS?.includes(d) :
          merchantType === 'caterer' ? catererConstants.MEVENTS_CONSTANTS.EVENT_SETTINGS.ALLOWED_DIETARY_FILTERS?.includes(d) : []
        )) || [],
        maxParticipants: merchantType === 'restaurant' ? restaurantConstants.MEVENTS_CONSTANTS.EVENT_SETTINGS.MAX_PARTICIPANTS :
                         merchantType === 'caterer' ? catererConstants.MEVENTS_CONSTANTS.EVENT_SETTINGS.MAX_PARTICIPANTS : 0,
        eventTypes: merchantType === 'restaurant' ? restaurantConstants.MEVENTS_CONSTANTS.EVENT_TYPES :
                    merchantType === 'caterer' ? catererConstants.MEVENTS_CONSTANTS.EVENT_TYPES : [],
      },
      mpark: {
        enabled: config.BUSINESS_SETTINGS.services.includes('mpark') && (
          merchantType === 'parking_lot' ? parkingLotConstants.MPARK_CONSTANTS.BOOKING_STATUSES.includes('pending') :
          merchantType === 'restaurant' ? restaurantConstants.MPARK_CONSTANTS.BOOKING_STATUSES.includes('pending') :
          merchantType === 'grocery' ? groceryConstants.MPARK_CONSTANTS.BOOKING_STATUSES.includes('pending') :
          merchantType === 'cafe' ? cafeConstants.MPARK_CONSTANTS.BOOKING_STATUSES.includes('pending') : false
        ),
        spaceTypes: merchantType === 'parking_lot' ? parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.SPACE_TYPES :
                    merchantType === 'restaurant' ? restaurantConstants.MPARK_CONSTANTS.SPACE_STATUSES :
                    merchantType === 'grocery' ? groceryConstants.MPARK_CONSTANTS.SPACE_STATUSES :
                    merchantType === 'cafe' ? cafeConstants.MPARK_CONSTANTS.SPACE_STATUSES : [],
        maxBookingDays: merchantType === 'parking_lot' ? parkingLotConstants.MPARK_CONSTANTS.BOOKING_POLICIES.MAX_BOOKING_DAYS :
                        merchantType === 'restaurant' ? restaurantConstants.MPARK_CONSTANTS.BOOKING_POLICIES.MAX_BOOKING_DAYS :
                        merchantType === 'grocery' ? groceryConstants.MPARK_CONSTANTS.BOOKING_POLICIES.MAX_BOOKING_DAYS :
                        merchantType === 'cafe' ? cafeConstants.MPARK_CONSTANTS.BOOKING_POLICIES.MAX_BOOKING_DAYS : 0,
      },
    };

    const customerOrders = await Order.findAll({
      where: { customer_id: customerId, merchant_id: merchantId, status: config.MUNCH_CONSTANTS?.ORDER_STATUSES || munchConstants.ORDER_CONSTANTS.ORDER_STATUSES },
      attributes: ['id', 'status'],
      transaction,
    });
    const customerBookings = await Booking.findAll({
      where: { customer_id: customerId, merchant_id: merchantId, status: config.MTABLES_CONSTANTS?.BOOKING_STATUSES || mtablesConstants.BOOKING_STATUSES },
      attributes: ['id', 'status'],
      transaction,
    });
    const customerRides = await sequelize.models.Ride.findAll({
      where: { customer_id: customerId, status: mtxiConstants.RIDE_STATUSES },
      attributes: ['id', 'status'],
      transaction,
    });
    const customerEvents = await sequelize.models.Event.findAll({
      where: { customer_id: customerId, merchant_id: merchantId, status: config.MEVENTS_CONSTANTS?.EVENT_STATUSES || meventsConstants.EVENT_STATUSES },
      attributes: ['id', 'status'],
      transaction,
    });
    const customerParking = await ParkingBooking.findAll({
      where: { customer_id: customerId, merchant_id: merchantId, status: config.MPARK_CONSTANTS?.BOOKING_STATUSES || mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES },
      attributes: ['id', 'status'],
      transaction,
    });

    await customer.update({
      preferred_language: merchant.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      notification_preferences: {
        ...customer.notification_preferences,
        [config.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('order_confirmation') ? 'order_confirmation' : customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ORDER_CONFIRMATION]: true,
        [config.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('booking_confirmation') ? 'booking_confirmation' : customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.BOOKING_CONFIRMATION]: true,
        [config.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('parking_alert') ? 'parking_alert' : customerConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.PARKING_CONFIRMATION]: true,
        [mtxiConstants.NOTIFICATION_TYPES.RIDE_REQUESTED]: true,
        [config.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('event_confirmation') ? 'event_confirmation' : meventsConstants.NOTIFICATION_TYPES.EVENT_CREATED]: true,
        [complianceConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.includes('certification_expiring') ? 'certification_expiring' : 'compliance_notification']: true,
      },
    }, { transaction });

    // Compliance checks
    const complianceCheck = complianceConstants.REGULATORY_REQUIREMENTS[merchantType.toUpperCase() + '_SPECIFIC'] || complianceConstants.REGULATORY_REQUIREMENTS.ALL_MERCHANTS;
    if (complianceCheck.includes('business_license') && !merchant.merchant_profile.business_license) {
      throw new AppError(complianceConstants.ERROR_CODES.includes('COMPLIANCE_VIOLATION') ? 'Compliance violation' : 'Compliance error', 400, complianceConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
    }

    logger.info(`Unified customer ${customerId} services for merchant ${merchantId} (${merchant.merchant_profile.business_name})`);
    return {
      merchantId,
      customerId,
      businessName: merchant.merchant_profile.business_name,
      merchantType,
      serviceSettings,
      customerActivity: {
        orders: customerOrders.length,
        bookings: customerBookings.length,
        rides: customerRides.length,
        events: customerEvents.length,
        parking: customerParking.length,
      },
      language: customer.preferred_language || customerConstants.CUSTOMER_SETTINGS.DEFAULT_LANGUAGE,
      currency: merchant.merchant_profile.currency || config.MUNCH_CONSTANTS?.MUNCH_SETTINGS?.DEFAULT_CURRENCY || mparkConstants.PARKING_CONFIG.DEFAULT_CURRENCY,
      complianceStatus: complianceConstants.CERTIFICATION_SETTINGS.CERTIFICATION_STATUSES.includes('approved') ? 'compliant' : 'pending',
      action: config.SUCCESS_MESSAGES.includes('order_processed') ? 'customerServiceUnified' : null,
    };
  } catch (error) {
    throw handleServiceError('unifyCustomerService', error, complianceConstants.ERROR_CODES.COMPLIANCE_VIOLATION);
  }
}

module.exports = { unifyServices, ensureConsistentUI, unifyCustomerService };