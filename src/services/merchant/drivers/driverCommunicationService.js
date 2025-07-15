'use strict';

const { Driver, Order, Merchant, Task, DriverAvailability, MerchantBranch } = require('@models');
const driverConstants = require('@constants/driver/driverConstants');
const munchConstants = require('@constants/common/munchConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const routeConstants = require('@constants/driver/routeOptimizationConstants');
const vehicleConstants = require('@constants/driver/vehicleConstants');
const staffConstants = require('@constants/staff/staffConstants');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

async function sendDriverMessage(driverId, message, ipAddress, notificationService, transaction = null) {
  try {
    const driver = await Driver.findByPk(driverId, {
      attributes: ['id', 'user_id', 'phone_number', 'merchant_id', 'preferred_language'],
      include: [
        { model: DriverAvailability, as: 'availability', attributes: ['status'] },
        { model: Merchant, as: 'merchant', attributes: ['business_type'] },
      ],
      transaction,
    });
    if (!driver) {
      throw new AppError('Driver not found', 404, driverConstants.ERROR_CODES[1]); // DRIVER_NOT_FOUND
    }

    if (driver.availability?.status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]) { // available
      throw new AppError('Invalid delivery assignment', 400, staffConstants.STAFF_ERROR_CODES[16]); // INVALID_DELIVERY_ASSIGNMENT
    }

    if (driver.merchant_id && !staffConstants.STAFF_ROLES.driver.supportedMerchantTypes.includes(driver.merchant?.business_type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const deliveryMethod = driver.phone_number
      ? staffConstants.STAFF_NOTIFICATION_CONSTANTS.DELIVERY_METHODS[2] // sms
      : staffConstants.STAFF_NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0]; // push

    const task = await Task.findOne({
      where: {
        staff_id: driver.user_id,
        task_type: staffConstants.STAFF_TASK_TYPES.driver.munch[0], // delivery_handover
        status: staffConstants.STAFF_TASK_STATUSES[0], // assigned
      },
      include: [{ model: MerchantBranch, as: 'branch', attributes: ['id', 'name', 'currency'] }],
      transaction,
    });

    if (task && !localizationConstants.SUPPORTED_CURRENCIES.includes(task.branch?.currency)) {
      throw new AppError('Unsupported currency', 400, munchConstants.ERROR_CODES[11]); // PAYMENT_FAILED
    }

    const notification = await notificationService.sendNotification(
      {
        userId: driver.user_id,
        notificationType: munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION,
        messageKey: 'driverCommunication.driverMessage',
        messageParams: {
          message,
          taskId: task ? task.id : 'N/A',
          branchName: task?.branch?.name || 'N/A',
        },
        deliveryMethod,
        priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[1], // medium
        role: driver.merchant_id ? staffConstants.STAFF_ROLES.driver.name : 'Driver', // Driver
        module: 'drivers',
        languageCode: driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      },
      transaction
    );

    logger.info(`Message sent to driver ${driverId}`, { audit: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER });
    return {
      driverId,
      notificationId: notification.notificationId,
      taskId: task ? task.id : null,
      language: driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
      currency: task?.branch?.currency || localizationConstants.DEFAULT_CURRENCY,
      success: staffConstants.SUCCESS_MESSAGES[5], // delivery_completed
    };
  } catch (error) {
    throw handleServiceError('sendDriverMessage', error, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
  }
}

async function broadcastDeliveryUpdates(orderId, message, ipAddress, notificationService, transaction = null) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Driver,
          as: 'driver',
          attributes: ['id', 'user_id', 'phone_number', 'merchant_id', 'preferred_language'],
          include: [
            { model: DriverAvailability, as: 'availability', attributes: ['status'] },
            { model: Merchant, as: 'merchant', attributes: ['business_type'] },
          ],
        },
        { model: Route, as: 'route', attributes: ['id', 'distance', 'trafficModel'] },
        { model: MerchantBranch, as: 'branch', attributes: ['id', 'name', 'currency'] },
      ],
      transaction,
    });
    if (!order || !order.driver) {
      throw new AppError('Order or driver not found', 404, munchConstants.ERROR_CODES[0]); // ORDER_NOT_FOUND
    }

    if (order.driver.availability?.status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]) { // available
      throw new AppError('Invalid delivery assignment', 400, staffConstants.STAFF_ERROR_CODES[16]); // INVALID_DELIVERY_ASSIGNMENT
    }

    if (!routeConstants.TRAFFIC_MODELS.includes(order.route?.trafficModel)) {
      throw new AppError('Invalid traffic model', 400, routeConstants.ERROR_CODES[6]); // TRAFFIC_DATA_UNAVAILABLE
    }

    if (!localizationConstants.SUPPORTED_CURRENCIES.includes(order.branch?.currency)) {
      throw new AppError('Unsupported currency', 400, munchConstants.ERROR_CODES[11]); // PAYMENT_FAILED
    }

    const task = await Task.findOne({
      where: {
        staff_id: order.driver.user_id,
        task_type: staffConstants.STAFF_TASK_TYPES.driver.munch[0], // delivery_handover
        status: staffConstants.STAFF_TASK_STATUSES[0], // assigned
      },
      transaction,
    });

    const notification = await notificationService.sendNotification(
      {
        userId: order.driver.user_id,
        notificationType: staffConstants.STAFF_NOTIFICATION_CONSTANTS.TYPES[4], // delivery_assignment
        messageKey: 'driverCommunication.deliveryUpdate',
        messageParams: {
          orderNumber: order.order_number,
          message,
          taskId: task ? task.id : 'N/A',
          branchName: order.branch?.name || 'N/A',
          routeDistance: order.route?.distance || 'N/A',
        },
        deliveryMethod: staffConstants.STAFF_NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0], // push
        priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS[2], // high
        orderId,
        role: order.driver.merchant_id ? staffConstants.STAFF_ROLES.driver.name : 'Driver', // Driver
        module: 'drivers',
        languageCode: order.driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      },
      transaction
    );

    logger.info(`Delivery update broadcast for order ${orderId}`, { audit: munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS });
    return {
      orderId,
      driverId: order.driver.id,
      notificationId: notification.notificationId,
      orderNumber: order.order_number,
      taskId: task ? task.id : null,
      language: order.driver.preferred_language || localizationConstants.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS,
      currency: order.branch?.currency || localizationConstants.DEFAULT_CURRENCY,
      success: staffConstants.SUCCESS_MESSAGES[5], // delivery_completed
    };
  } catch (error) {
    throw handleServiceError('broadcastDeliveryUpdates', error, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
  }
}

async function manageDriverChannels(merchantId, ipAddress, transaction = null) {
  try {
    const merchant = await Merchant.findByPk(merchantId, {
      attributes: ['id', 'business_type'],
      include: [{ model: MerchantBranch, as: 'branches', attributes: ['id', 'name', 'currency'] }],
      transaction,
    });
    if (!merchant || !staffConstants.STAFF_ROLES.driver.supportedMerchantTypes.includes(merchant.business_type)) {
      throw new AppError('Invalid merchant type', 404, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
    }

    const drivers = await Driver.findAll({
      where: { merchant_id: merchantId, status: driverConstants.DRIVER_STATUSES[0] }, // available
      attributes: ['id', 'user_id'],
      include: [
        { model: DriverAvailability, as: 'availability', attributes: ['status'] },
        { model: Vehicle, as: 'vehicles', attributes: ['id', 'type'] },
      ],
      transaction,
    });

    if (drivers.length > staffConstants.STAFF_SETTINGS.MAX_STAFF_PER_BRANCH) {
      throw new AppError('Max drivers exceeded', 400, staffConstants.STAFF_ERROR_CODES[2]); // PERMISSION_DENIED
    }

    const tasks = await Task.findAll({
      where: {
        staff_id: drivers.map((driver) => driver.user_id),
        task_type: staffConstants.STAFF_TASK_TYPES.driver.munch[0], // delivery_handover
        status: staffConstants.STAFF_TASK_STATUSES[0], // assigned
      },
      include: [{ model: MerchantBranch, as: 'branch', attributes: ['id', 'name', 'currency'] }],
      transaction,
    });

    if (tasks.length > munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.BATCH_DELIVERY_LIMIT) {
      throw new AppError('Max delivery tasks exceeded', 400, munchConstants.ERROR_CODES[0]); // ORDER_NOT_FOUND
    }

    logger.info(`Driver channels updated for merchant ${merchantId}`, { audit: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER });
    return {
      merchantId,
      driverCount: drivers.length,
      taskCount: tasks.length,
      driverIds: drivers.map((driver) => driver.id),
      taskIds: tasks.map((task) => task.id),
      branchIds: merchant.branches.map((branch) => branch.id),
      language: localizationConstants.DEFAULT_LANGUAGE,
      action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
      currency: merchant.branches[0]?.currency || localizationConstants.DEFAULT_CURRENCY,
      success: staffConstants.SUCCESS_MESSAGES[5], // delivery_completed
    };
  } catch (error) {
    throw handleServiceError('manageDriverChannels', error, merchantConstants.ERROR_CODES[0]); // INVALID_MERCHANT_TYPE
  }
}

module.exports = { sendDriverMessage, broadcastDeliveryUpdates, manageDriverChannels };