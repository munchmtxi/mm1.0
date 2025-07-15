'use strict';

const { cacheOrders, cacheBookings, syncOfflineData } = require('@services/merchant/offline/offlineService');
const { User, Merchant, OfflineCache, Customer } = require('@models').sequelize.models;
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const { formatMessage } = require('@utils/localization');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');

const cacheOrdersController = catchAsync(async (req, res) => {
  const { restaurantId, orders } = req.body;
  const { merchantId, orderCount } = await cacheOrders(restaurantId, orders);

  const merchant = await User.findByPk(merchantId, { include: [{ model: Merchant, as: 'merchant_profile' }] });

  await socketService.emit(null, 'offline:orders_cached', { merchantId, orderCount }, `merchant:${merchantId}`);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.SECURITY_CONSTANTS.AUDIT_TYPES.CACHE_ORDERS,
    details: { merchantId, orderCount },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.ORDERS_CACHED,
    messageKey: 'offline.ordersCached',
    messageParams: { count: orderCount, merchantId },
    role: 'merchant',
    module: 'offline',
    languageCode: merchant.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'offline', 'en', 'ordersCached', { count: orderCount, merchantId }),
    data: { merchantId, orderCount },
  });
});

const cacheBookingsController = catchAsync(async (req, res) => {
  const { restaurantId, bookings } = req.body;
  const { merchantId, bookingCount } = await cacheBookings(restaurantId, bookings);

  const merchant = await User.findByPk(merchantId, { include: [{ model: Merchant, as: 'merchant_profile' }] });

  await socketService.emit(null, 'offline:bookings_cached', { merchantId, bookingCount }, `merchant:${merchantId}`);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.SECURITY_CONSTANTS.AUDIT_TYPES.CACHE_BOOKINGS,
    details: { merchantId, bookingCount },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.BOOKINGS_CACHED,
    messageKey: 'offline.bookingsCached',
    messageParams: { count: bookingCount, merchantId },
    role: 'merchant',
    module: 'offline',
    languageCode: merchant.preferred_language || 'en',
  });

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'offline', 'en', 'bookingsCached', { count: bookingCount, merchantId }),
    data: { merchantId, bookingCount },
  });
});

const syncOfflineDataController = catchAsync(async (req, res) => {
  const { restaurantId } = req.body;
  const { merchantId, orderCount, bookingCount } = await syncOfflineData(restaurantId);

  const merchant = await User.findByPk(merchantId, { include: [{ model: Merchant, as: 'merchant_profile' }] });

  await socketService.emit(null, 'offline:data_synced', { merchantId, orderCount, bookingCount }, `merchant:${merchantId}`);

  await auditService.logAction({
    userId: merchantId,
    role: 'merchant',
    action: merchantConstants.SECURITY_CONSTANTS.AUDIT_TYPES.SYNC_OFFLINE_DATA,
    details: { merchantId, orderCount, bookingCount },
    ipAddress: req.ip || '0.0.0.0',
  });

  await notificationService.sendNotification({
    userId: merchantId,
    notificationType: merchantConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES.DATA_SYNCED,
    messageKey: 'offline.dataSynced',
    messageParams: { orderCount, bookingCount, merchantId },
    role: 'merchant',
    module: 'offline',
    languageCode: merchant.preferred_language || 'en',
  });

  // Award points for offline orders and bookings
  const cachedItems = await OfflineCache.findAll({
    where: { merchant_id: merchantId, status: merchantConstants.OFFLINE_CONSTANTS.CACHE_STATUSES[1] },
  });

  const customerPoints = {};
  for (const item of cachedItems) {
    const customerId = item.data.customer_id;
    if (!customerPoints[customerId]) customerPoints[customerId] = { orders: 0, bookings: 0 };
    if (item.data_type === merchantConstants.OFFLINE_CONSTANTS.DATA_TYPES[0]) customerPoints[customerId].orders++;
    else if (item.data_type === merchantConstants.OFFLINE_CONSTANTS.DATA_TYPES[1]) customerPoints[customerId].bookings++;
  }

  for (const [customerId, counts] of Object.entries(customerPoints)) {
    const points =
      counts.orders * customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'offline_order').points +
      counts.bookings * customerConstants.GAMIFICATION_CONSTANTS.CUSTOMER_ACTIONS.find(a => a.action === 'offline_booking').points;
    if (points > 0) {
      await pointService.awardPoints({
        userId: customerId,
        role: 'customer',
        action: 'offline_usage',
        languageCode: merchant.preferred_language || 'en',
      });
    }
  }

  res.status(200).json({
    status: 'success',
    message: formatMessage('merchant', 'offline', 'en', 'dataSynced', { orderCount, bookingCount, merchantId }),
    data: { merchantId, orderCount, bookingCount },
  });
});

module.exports = {
  cacheOrdersController,
  cacheBookingsController,
  syncOfflineDataController,
};