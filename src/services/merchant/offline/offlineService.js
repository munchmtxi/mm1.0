'use strict';

const { sequelize, User, Merchant, MerchantBranch, Order, Booking, ParkingBooking, OfflineCache, Customer, Wallet, WalletTransaction, Staff, Table, Shift, SupportTicket } = require('@models');
const merchantConstants = require('@constants/merchant/merchantConstants');
const munchConstants = require('@constants/common/munchConstants');
const mtablesConstants = require('@constants/common/mtablesConstants');
const mparkConstants = require('@constants/common/mparkConstants');
const staffConstants = require('@constants/staff/staffConstants');
const customerConstants = require('@constants/customer/customerConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');

const cacheOrders = async (restaurantId, orders) => {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await User.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!merchant || !merchant.merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const branch = await MerchantBranch.findOne({ where: { merchant_id: merchant.merchant.id }, transaction });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    for (const order of orders) {
      if (!order.items || !order.total_amount || !order.customer_id || !munchConstants.ORDER_CONSTANTS.ORDER_TYPES.includes(order.order_type)) {
        throw new AppError('Invalid order data', 400, munchConstants.ERROR_CODES[4]);
      }
      await OfflineCache.create(
        {
          merchant_id: restaurantId,
          branch_id: branch.id,
          data_type: 'order',
          data: order,
          status: 'pending',
        },
        { transaction },
      );
    }

    await transaction.commit();
    logger.logApiEvent(`Cached ${orders.length} orders for merchant ${restaurantId}`, { type: 'order_cache' });
    return { merchantId: restaurantId, orderCount: orders.length };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error caching orders', { error: error.message, restaurantId });
    throw handleServiceError('cacheOrders', error, munchConstants.ERROR_CODES[4]);
  }
};

const cacheBookings = async (restaurantId, bookings) => {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await User.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!merchant || !merchant.merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const branch = await MerchantBranch.findOne({ where: { merchant_id: merchant.merchant.id }, transaction });
    if (!branch) {
      throw new AppError('Branch not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    for (const booking of bookings) {
      if (
        !booking.booking_date ||
        !booking.booking_time ||
        !booking.customer_id ||
        !mtablesConstants.BOOKING_TYPES.includes(booking.booking_type)
      ) {
        throw new AppError('Invalid booking data', 400, mtablesConstants.ERROR_TYPES[0]);
      }
      await OfflineCache.create(
        {
          merchant_id: restaurantId,
          branch_id: branch.id,
          data_type: 'booking',
          data: booking,
          status: 'pending',
        },
        { transaction },
      );
    }

    await transaction.commit();
    logger.logApiEvent(`Cached ${bookings.length} bookings for merchant ${restaurantId}`, { type: 'booking_cache' });
    return { merchantId: restaurantId, bookingCount: bookings.length };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error caching bookings', { error: error.message, restaurantId });
    throw handleServiceError('cacheBookings', error, mtablesConstants.ERROR_TYPES[0]);
  }
};

const cacheParkingBookings = async (restaurantId, parkingBookings) => {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await User.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!merchant || !merchant.merchant || !mparkConstants.MERCHANT_TYPE.includes(merchant.merchant.merchant_type)) {
      throw new AppError('Invalid merchant or type', 404, mparkConstants.ERROR_TYPES[7]);
    }

    for (const parkingBooking of parkingBookings) {
      if (
        !parkingBooking.start_time ||
        !parkingBooking.end_time ||
        !parkingBooking.customer_id ||
        !parkingBooking.space_id ||
        !mparkConstants.BOOKING_CONFIG.BOOKING_TYPES.includes(parkingBooking.booking_type)
      ) {
        throw new AppError('Invalid parking booking data', 400, mparkConstants.ERROR_TYPES[0]);
      }
      await OfflineCache.create(
        {
          merchant_id: restaurantId,
          data_type: 'parking_booking',
          data: parkingBooking,
          status: 'pending',
        },
        { transaction },
      );
    }

    await transaction.commit();
    logger.logApiEvent(`Cached ${parkingBookings.length} parking bookings for merchant ${restaurantId}`, { type: 'parking_booking_cache' });
    return { merchantId: restaurantId, parkingBookingCount: parkingBookings.length };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error caching parking bookings', { error: error.message, restaurantId });
    throw handleServiceError('cacheParkingBookings', error, mparkConstants.ERROR_TYPES[0]);
  }
};

const syncOfflineData = async (restaurantId) => {
  const transaction = await sequelize.transaction();
  try {
    const merchant = await User.findByPk(restaurantId, {
      include: [{ model: Merchant, as: 'merchant' }],
      transaction,
    });
    if (!merchant || !merchant.merchant) {
      throw new AppError('Merchant not found', 404, merchantConstants.ERROR_CODES[0]);
    }

    const cachedItems = await OfflineCache.findAll({
      where: { merchant_id: restaurantId, status: 'pending' },
      transaction,
    });

    let orderCount = 0, bookingCount = 0, parkingBookingCount = 0;

    for (const item of cachedItems) {
      try {
        const staff = await Staff.findOne({
          where: { merchant_id: merchant.merchant.id, availability_status: staffConstants.STAFF_SETTINGS.AVAILABILITY_STATUSES[0] },
          include: [{ model: Shift, as: 'shift', where: { status: staffConstants.STAFF_STATUSES[0] } }],
          transaction,
        });

        if (item.data_type === 'order') {
          const orderData = item.data;
          const customer = await Customer.findByPk(orderData.customer_id, { transaction });
          if (!customer) {
            throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
          }

          const wallet = await Wallet.findOne({ where: { user_id: customer.user_id }, transaction });
          if (!wallet || wallet.balance < orderData.total_amount) {
            throw new AppError('Insufficient wallet balance', 400, munchConstants.ERROR_CODES[12]);
          }

          const branch = await MerchantBranch.findOne({ where: { merchant_id: merchant.merchant.id }, transaction });
          const order = await Order.create(
            {
              ...orderData,
              merchant_id: restaurantId,
              branch_id: branch?.id,
              order_number: `OFFLINE-${Date.now()}-${orderCount}`,
              status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[0],
              payment_status: munchConstants.PAYMENT_STATUSES[0],
              currency: orderData.currency || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
              staff_id: staff?.id,
              created_at: new Date(),
              updated_at: new Date(),
            },
            { transaction },
          );

          await WalletTransaction.create(
            {
              wallet_id: wallet.id,
              type: customerConstants.WALLET_CONSTANTS.TRANSACTION_TYPES[2],
              amount: orderData.total_amount,
              currency: order.currency,
              status: customerConstants.WALLET_CONSTANTS.PAYMENT_STATUSES[1],
              description: `Payment for order ${order.order_number}`,
            },
            { transaction },
          );

          wallet.balance -= orderData.total_amount;
          await wallet.save({ transaction });

          item.status = 'synced';
          orderCount++;
        } else if (item.data_type === 'booking') {
          const bookingData = item.data;
          const customer = await Customer.findByPk(bookingData.customer_id, { transaction });
          if (!customer) {
            throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
          }

          const table = await Table.findOne({
            where: {
              branch_id: bookingData.branch_id,
              status: mtablesConstants.TABLE_STATUSES[0],
              capacity: { [sequelize.Op.gte]: bookingData.guest_count || 1 },
            },
            transaction,
          });

          const branch = await MerchantBranch.findOne({ where: { merchant_id: merchant.merchant.id }, transaction });
          await Booking.create(
            {
              ...bookingData,
              merchant_id: restaurantId,
              branch_id: branch?.id,
              table_id: table?.id,
              reference: `OFFLINE-BK-${Date.now()}-${bookingCount}`,
              status: mtablesConstants.BOOKING_STATUSES[0],
              staff_id: staff?.id,
              created_at: new Date(),
              updated_at: new Date(),
            },
            { transaction },
          );

          item.status = 'synced';
          bookingCount++;
        } else if (item.data_type === 'parking_booking') {
          const parkingData = item.data;
          const customer = await Customer.findByPk(parkingData.customer_id, { transaction });
          if (!customer) {
            throw new AppError('Customer not found', 404, customerConstants.ERROR_CODES[1]);
          }

          await ParkingBooking.create(
            {
              ...parkingData,
              merchant_id: restaurantId,
              status: mparkConstants.BOOKING_CONFIG.BOOKING_STATUSES[0],
              created_at: new Date(),
              updated_at: new Date(),
            },
            { transaction },
          );

          item.status = 'synced';
          parkingBookingCount++;
        }

        await item.save({ transaction });
      } catch (error) {
        item.status = 'failed';
        await item.save({ transaction });

        await SupportTicket.create(
          {
            user_id: merchant.user_id,
            service_type: customerConstants.CROSS_VERTICAL_CONSTANTS.SERVICES[1],
            issue_type: item.data_type === 'order' ? munchConstants.SUPPORT_CONSTANTS.ISSUE_TYPES[4] :
                        item.data_type === 'booking' ? mtablesConstants.SUPPORT_SETTINGS.ISSUE_TYPES[0] :
                        mparkConstants.ERROR_TYPES[9],
            description: `Failed to sync ${item.data_type}: ${error.message}`,
            status: mtablesConstants.SUPPORT_SETTINGS.TICKET_STATUSES[0],
            priority: mtablesConstants.SUPPORT_SETTINGS.PRIORITIES[1],
            ticket_number: `TICKET-${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date(),
          },
          { transaction },
        );

        logger.logErrorEvent(`Failed to sync ${item.data_type} for merchant ${restaurantId}`, { error: error.message });
      }
    }

    await transaction.commit();
    logger.logApiEvent(`Synced ${orderCount} orders, ${bookingCount} bookings, ${parkingBookingCount} parking bookings for merchant ${restaurantId}`, { type: 'sync' });
    return { merchantId: restaurantId, orderCount, bookingCount, parkingBookingCount };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error syncing offline data', { error: error.message, restaurantId });
    throw handleServiceError('syncOfflineData', error, merchantConstants.ERROR_CODES[0]);
  }
};

module.exports = {
  cacheOrders,
  cacheBookings,
  cacheParkingBookings,
  syncOfflineData,
};