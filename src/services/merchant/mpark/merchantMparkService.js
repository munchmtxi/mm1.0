'use strict';

const { Op } = require('sequelize');
const { ParkingSpace, ParkingBooking, Merchant, MerchantBranch, Customer, Payment, Wallet, WalletTransaction } = require('@models');
const mparkConstants = require('@constants/common/mparkConstants');
const parkingLotConstants = require('@constants/merchant/parkingLotConstants');
const carParkOperativeConstants = require('@constants/staff/carParkOperativeConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');

async function createParkingSpace(merchantId, branchId, spaceDetails) {
  try {
    const { spaceType, securityFeatures, accessType, egressType, location, dimensions } = spaceDetails;

    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant || merchant.business_type !== parkingLotConstants.MERCHANT_TYPE) {
      throw new AppError(parkingLotConstants.ERROR_CODES[0], 400, parkingLotConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== merchantId) {
      throw new AppError(carParkOperativeConstants.ERROR_CODES[2], 400, carParkOperativeConstants.ERROR_CODES[2]); // INVALID_BRANCH
    }

    if (!parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.SPACE_TYPES.includes(spaceType) ||
        !parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.ACCESS_TYPES.includes(accessType) ||
        !parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.EGRESS_TYPES.includes(egressType)) {
      throw new AppError(parkingLotConstants.ERROR_CODES[4], 400, parkingLotConstants.ERROR_CODES[4]); // INVALID_SPACE_TYPE
    }

    const spaceCount = await ParkingSpace.count({ where: { merchant_id: merchantId } });
    if (spaceCount >= parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.QUANTITY_LIMITS.MAX_SPACES_PER_LOT) {
      throw new AppError(parkingLotConstants.ERROR_CODES[4], 400, parkingLotConstants.ERROR_CODES[4]); // INVALID_SPACE_TYPE
    }

    const space = await ParkingSpace.create({
      merchant_id: merchantId,
      space_type: spaceType,
      status: mparkConstants.SPACE_CONFIG.SPACE_STATUSES[0], // AVAILABLE
      security_features: securityFeatures,
      access_type: accessType,
      egress_type: egressType,
      location,
      dimensions,
    });

    logger.info('Parking space created', { merchantId, branchId, spaceId: space.id });
    return { message: parkingLotConstants.SUCCESS_MESSAGES[0], space }; // parking_booking_confirmed
  } catch (error) {
    throw handleServiceError('createParkingSpace', error, parkingLotConstants.ERROR_CODES[0]);
  }
}

async function updateParkingSpace(spaceId, merchantId, updates) {
  try {
    const space = await ParkingSpace.findByPk(spaceId);
    if (!space || space.merchant_id !== merchantId) {
      throw new AppError(mparkConstants.ERROR_TYPES[0], 404, mparkConstants.ERROR_TYPES[0]); // INVALID_PARKING_SPOT
    }

    const { spaceType, securityFeatures, accessType, egressType, status, location, dimensions } = updates;
    if (spaceType && !parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.SPACE_TYPES.includes(spaceType)) {
      throw new AppError(parkingLotConstants.ERROR_CODES[4], 400, parkingLotConstants.ERROR_CODES[4]); // INVALID_SPACE_TYPE
    }
    if (accessType && !parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.ACCESS_TYPES.includes(accessType)) {
      throw new AppError(parkingLotConstants.ERROR_CODES[4], 400, parkingLotConstants.ERROR_CODES[4]); // INVALID_SPACE_TYPE
    }
    if (egressType && !parkingLotConstants.BUSINESS_SETTINGS.SPACE_CONFIG.EGRESS_TYPES.includes(egressType)) {
      throw new AppError(parkingLotConstants.ERROR_CODES[4], 400, parkingLotConstants.ERROR_CODES[4]); // INVALID_SPACE_TYPE
    }
    if (status && !mparkConstants.SPACE_CONFIG.SPACE_STATUSES.includes(status)) {
      throw new AppError(parkingLotConstants.ERROR_CODES[4], 400, parkingLotConstants.ERROR_CODES[4]); // INVALID_SPACE_TYPE
    }

    await space.update({ space_type: spaceType, security_features: securityFeatures, access_type: accessType, egress_type: egressType, status, location, dimensions });

    logger.info('Parking space updated', { spaceId, merchantId });
    return { message: parkingLotConstants.SUCCESS_MESSAGES[0], space }; // parking_booking_confirmed
  } catch (error) {
    throw handleServiceError('updateParkingSpace', error, parkingLotConstants.ERROR_CODES[4]);
  }
}

async function deleteParkingSpace(spaceId, merchantId) {
  try {
    const space = await ParkingSpace.findByPk(spaceId);
    if (!space || space.merchant_id !== merchantId) {
      throw new AppError(mparkConstants.ERROR_TYPES[0], 404, mparkConstants.ERROR_TYPES[0]); // INVALID_PARKING_SPOT
    }

    const activeBookings = await ParkingBooking.count({
      where: { space_id: spaceId, status: { [Op.in]: ['PENDING', 'CONFIRMED', 'OCCUPIED'] } },
    });
    if (activeBookings > 0) {
      throw new AppError(mparkConstants.ERROR_TYPES[9], 400, mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
    }

    await space.destroy();
    logger.info('Parking space deleted', { spaceId, merchantId });
    return { message: parkingLotConstants.SUCCESS_MESSAGES[0] }; // parking_booking_confirmed
  } catch (error) {
    throw handleServiceError('deleteParkingSpace', error, mparkConstants.ERROR_TYPES[0]);
  }
}

async function getMerchantBookings(merchantId, branchId) {
  try {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant || merchant.business_type !== parkingLotConstants.MERCHANT_TYPE) {
      throw new AppError(parkingLotConstants.ERROR_CODES[0], 400, parkingLotConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== merchantId) {
      throw new AppError(carParkOperativeConstants.ERROR_CODES[2], 400, carParkOperativeConstants.ERROR_CODES[2]); // INVALID_BRANCH
    }

    const bookings = await ParkingBooking.findAll({
      where: { merchant_id: merchantId },
      include: [
        { model: Customer, as: 'customer' },
        { model: ParkingSpace, as: 'space', where: { merchant_id: merchantId } },
      ],
    });

    logger.info('Merchant bookings retrieved', { merchantId, branchId });
    return bookings;
  } catch (error) {
    throw handleServiceError('getMerchantBookings', error, parkingLotConstants.ERROR_CODES[0]);
  }
}

async function confirmBooking(bookingId, merchantId) {
  try {
    const booking = await ParkingBooking.findByPk(bookingId);
    if (!booking || booking.merchant_id !== merchantId) {
      throw new AppError(mparkConstants.ERROR_TYPES[9], 404, mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
    }

    if (booking.status !== mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[0]) { // PENDING
      throw new AppError(mparkConstants.ERROR_TYPES[5], 400, mparkConstants.ERROR_TYPES[5]); // EXTENSION_NOT_ALLOWED
    }

    booking.status = mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[1]; // CONFIRMED
    await booking.save();

    logger.info('Parking booking confirmed', { bookingId, merchantId });
    return { message: parkingLotConstants.SUCCESS_MESSAGES[0] }; // parking_booking_confirmed
  } catch (error) {
    throw handleServiceError('confirmBooking', error, mparkConstants.ERROR_TYPES[9]);
  }
}

async function processCheckIn(bookingId, merchantId, method) {
  try {
    const booking = await ParkingBooking.findByPk(bookingId);
    if (!booking || booking.merchant_id !== merchantId) {
      throw new AppError(mparkConstants.ERROR_TYPES[9], 404, mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
    }

    if (!mparkConstants.BOOKING_CONFIG.CHECK_IN_METHODS.includes(method)) {
      throw new AppError(mparkConstants.ERROR_TYPES[2], 400, mparkConstants.ERROR_TYPES[2]); // INVALID_BOOKING_DURATION
    }

    if (booking.status !== mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[1]) { // CONFIRMED
      throw new AppError(mparkConstants.ERROR_TYPES[5], 400, mparkConstants.ERROR_TYPES[5]); // EXTENSION_NOT_ALLOWED
    }

    booking.status = mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[2]; // OCCUPIED
    booking.check_in_method = method;
    await booking.save();

    const space = await ParkingSpace.findByPk(booking.space_id);
    space.status = mparkConstants.SPACE_CONFIG.SPACE_STATUSES[1]; // OCCUPIED
    await space.save();

    logger.info('Parking check-in processed', { bookingId, merchantId, method });
    return { message: parkingLotConstants.SUCCESS_MESSAGES[2] }; // check_in_processed
  } catch (error) {
    throw handleServiceError('processCheckIn', error, mparkConstants.ERROR_TYPES[9]);
  }
}

async function processPayment(bookingId, merchantId, amount, currency, paymentMethod) {
  try {
    const booking = await ParkingBooking.findByPk(bookingId);
    if (!booking || booking.merchant_id !== merchantId) {
      throw new AppError(mparkConstants.ERROR_TYPES[9], 404, mparkConstants.ERROR_TYPES[9]); // PARKING_BOOKING_NOT_FOUND
    }

    if (!parkingLotConstants.WALLET_CONSTANTS.PAYMENT_METHODS.includes(paymentMethod)) {
      throw new AppError(mparkConstants.ERROR_TYPES[3], 400, mparkConstants.ERROR_TYPES[3]); // PAYMENT_FAILED
    }

    if (!localizationConstants.SUPPORTED_CURRENCIES.includes(currency)) {
      throw new AppError(mparkConstants.ERROR_TYPES[3], 400, mparkConstants.ERROR_TYPES[3]); // PAYMENT_FAILED
    }

    const merchant = await Merchant.findByPk(merchantId);
    const merchantWallet = await Wallet.findOne({ where: { merchant_id: merchantId } });
    if (!merchantWallet) {
      throw new AppError(mparkConstants.ERROR_TYPES[3], 400, mparkConstants.ERROR_TYPES[3]); // PAYMENT_FAILED
    }

    const customer = await Customer.findByPk(booking.customer_id);
    const customerWallet = await Wallet.findOne({ where: { user_id: customer.user_id } });
    if (!customerWallet || customerWallet.balance < amount) {
      throw new AppError(mparkConstants.ERROR_TYPES[10], 400, mparkConstants.ERROR_TYPES[10]); // WALLET_INSUFFICIENT_FUNDS
    }

    const payment = await Payment.create({
      booking_id: bookingId,
      customer_id: booking.customer_id,
      merchant_id: merchantId,
      amount,
      currency,
      payment_method: paymentMethod,
      status: parkingLotConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1], // completed
    });

    await WalletTransaction.create({
      wallet_id: customerWallet.id,
      type: mparkConstants.PAYMENT_CONFIG.TRANSACTION_TYPES[0], // PARKING_PAYMENT
      amount: -amount,
      currency,
      status: mparkConstants.PAYMENT_CONFIG.PAYMENT_STATUSES[1], // COMPLETED
      description: `Payment for booking ${bookingId}`,
    });

    await WalletTransaction.create({
      wallet_id: merchantWallet.id,
      type: mparkConstants.PAYMENT_CONFIG.TRANSACTION_TYPES[2], // MERCHANT_PAYOUT
      amount,
      currency,
      status: mparkConstants.PAYMENT_CONFIG.PAYMENT_STATUSES[1], // COMPLETED
      description: `Payout for booking ${bookingId}`,
    });

    customerWallet.balance -= amount;
    merchantWallet.balance += amount;
    await customerWallet.save();
    await merchantWallet.save();

    logger.info('Payment processed', { bookingId, merchantId, amount });
    return { message: parkingLotConstants.SUCCESS_MESSAGES[1], payment }; // payment_completed
  } catch (error) {
    throw handleServiceError('processPayment', error, mparkConstants.ERROR_TYPES[3]);
  }
}

async function getParkingAnalytics(merchantId, branchId, period) {
  try {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant || merchant.business_type !== parkingLotConstants.MERCHANT_TYPE) {
      throw new AppError(parkingLotConstants.ERROR_CODES[0], 400, parkingLotConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== merchantId) {
      throw new AppError(carParkOperativeConstants.ERROR_CODES[2], 400, carParkOperativeConstants.ERROR_CODES[2]); // INVALID_BRANCH
    }

    if (!parkingLotConstants.ANALYTICS_CONSTANTS.REPORT_FORMATS.includes(period)) {
      throw new AppError(parkingLotConstants.ERROR_CODES[1], 400, parkingLotConstants.ERROR_CODES[1]); // PERMISSION_DENIED
    }

    const bookings = await ParkingBooking.findAll({
      where: { merchant_id: merchantId },
      include: [{ model: ParkingSpace, as: 'space' }],
    });

    const totalBookings = bookings.length;
    const occupancyRate = (bookings.filter(b => b.status === 'OCCUPIED').length / totalBookings) * 100 || 0;
    const averageBookingDuration = bookings.reduce((sum, b) => {
      const duration = (new Date(b.end_time) - new Date(b.start_time)) / 60000;
      return sum + duration;
    }, 0) / totalBookings || 0;

    const revenue = await Payment.sum('amount', {
      where: { merchant_id: merchantId, status: parkingLotConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1] },
    }) || 0;

    logger.info('Parking analytics retrieved', { merchantId, branchId, period });
    return {
      metrics: {
        totalBookings,
        occupancyRate,
        averageBookingDuration,
        revenue,
      },
    };
  } catch (error) {
    throw handleServiceError('getParkingAnalytics', error, parkingLotConstants.ERROR_CODES[0]);
  }
}

module.exports = {
  createParkingSpace,
  updateParkingSpace,
  deleteParkingSpace,
  getMerchantBookings,
  confirmBooking,
  processCheckIn,
  processPayment,
  getParkingAnalytics,
};