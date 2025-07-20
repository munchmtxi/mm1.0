// deliveryService.js
// Manages delivery operations for munch staff. Handles driver assignments, package preparation, driver tracking, reassignment, and cancellation.
// Last Updated: July 15, 2025

'use strict';

const { Op } = require('sequelize');
const { Order, Driver, Staff, DriverAvailability, Merchant, Customer, DriverRatings } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const driverConstants = require('@constants/driver/driverConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const customerConstants = require('@constants/customer/customerConstants');
const logger = require('@utils/logger');
const { handleServiceError } = require('@utils/errorHandling');
const { getCurrentTimestamp, formatDate, isWithinRange } = require('@utils/dateTimeUtils');
const AppError = require('@utils/AppError');

async function assignDriver(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Staff, as: 'staff' },
        { model: Merchant, as: 'merchant' },
        { model: Customer, as: 'customer' }
      ]
    });
    if (!order) {
      throw new AppError(munchConstants.ERROR_CODES.ORDER_NOT_FOUND, 404, null, null, { orderId });
    }

    const staff = await Staff.findByPk(staffId, {
      include: [{ model: Merchant, as: 'merchant' }]
    });
    if (!staff || !staff.staff_types.includes(staffConstants.STAFF_ROLES.manager.name.toLowerCase())) {
      throw new AppError(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND, 404, 'INVALID_STAFF_TYPE', null, { staffId });
    }

    const supportedTypes = [
      ...driverConstants.MUNUCH_DELIVERY_CONSTANTS.SUPPORTED_MERCHANT_TYPES,
      ...staffConstants.SUPPORTED_MERCHANT_TYPES
    ];
    if (!supportedTypes.includes(order.merchant.business_type)) {
      throw new AppError(merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE, 400, null, null, { merchantId: order.merchant_id });
    }

    if (!customerConstants.CUSTOMER_STATUSES.includes(order.customer.status) || order.customer.status !== 'active') {
      throw new AppError(customerConstants.ERROR_CODES.INVALID_CUSTOMER, 400, null, null, { customerId: order.customer_id });
    }

    let assignedDriver = await Driver.findOne({
      where: {
        availability_status: driverConstants.DRIVER_STATUSES[0],
        status: driverConstants.DRIVER_STATUSES[0]
      },
      include: [{
        model: DriverAvailability,
        where: {
          status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0],
          isOnline: true,
          date: getCurrentTimestamp().split('T')[0]
        }
      }, {
        model: DriverRatings,
        as: 'ratings',
        required: false
      }]
    });

    if (!assignedDriver) {
      assignedDriver = await Staff.findOne({
        where: {
          staff_types: { [Op.contains]: [staffConstants.STAFF_ROLE] },
          availability_status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]
        }
      });
    }

    if (!assignedDriver) {
      throw new AppError(munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED, 404, null, null, { orderId });
    }

    const driverType = assignedDriver instanceof Driver ? 'common' : 'staff';
    const driverId = assignedDriver.id;

    if (driverType === 'common') {
      const requiredCerts = driverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS;
      if (!assignedDriver.vehicle_info || !requiredCerts.every(cert => assignedDriver.vehicle_info[cert])) {
        throw new AppError(driverConstants.ERROR_CODES.CERTIFICATION_EXPIRED, 400, null, null, { driverId });
      }
    } else {
      const requiredCerts = staffConstants.CERTIFICATIONS.REQUIRED;
      if (!assignedDriver.certifications || !requiredCerts.every(cert => assignedDriver.certifications.includes(cert))) {
        throw new AppError(staffConstants.ERROR_CODES[2], 400, null, null, { staffId: driverId });
      }
    }

    const maxShiftHours = driverType === 'common'
      ? driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS
      : staffConstants.SHIFT_SETTINGS.MAX_SHIFT_HOURS;
    if (assignedDriver.current_shift_hours >= maxShiftHours) {
      throw new AppError(driverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT, 400, null, null, { driverId });
    }

    await order.update({
      [driverType === 'common' ? 'driver_id' : 'staff_id']: driverId,
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4],
      updated_at: getCurrentTimestamp(),
      routing_info: {
        ...order.routing_info,
        routing_timestamp: getCurrentTimestamp(),
        routing_reason: `Assigned ${driverType} driver`
      }
    });

    const notification = {
      type: driverType === 'common'
        ? driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1]
        : staffConstants.NOTIFICATION_CONSTANTS.TYPES[0],
      deliveryMethod: driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
      driverId,
      orderId
    };
    logger.logApiEvent(munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY, { ...notification, merchantId: order.merchant_id, customerId: order.customer_id });

    return { order, driver: assignedDriver, driverType };
  } catch (error) {
    logger.logErrorEvent('Error assigning driver', { error: error.message, orderId, staffId });
    throw handleServiceError('assignDriver', error, error.code || munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }
}

async function prepareDeliveryPackage(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Merchant, as: 'merchant' },
        { model: Customer, as: 'customer' }
      ]
    });
    if (!order) {
      throw new AppError(munchConstants.ERROR_CODES.ORDER_NOT_FOUND, 404, null, null, { orderId });
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staff.staff_types.includes(staffConstants.STAFF_ROLES.packager.name.toLowerCase())) {
      throw new AppError(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND, 404, 'INVALID_STAFF_TYPE', null, { staffId });
    }

    if (!munchConstants.ORDER_CONSTANTS.ORDER_TYPES.includes(order.order_type)) {
      throw new AppError(munchConstants.ERROR_CODES.INVALID_ORDER_TYPE, 400, null, null, { orderId });
    }

    const prepTime = merchantConstants.STAFF_CONSTANTS.PERFORMANCE_THRESHOLDS.PREP_TIME_MINUTES[order.merchant.business_type] || 10;
    if (order.created_at && !isWithinRange(new Date(), order.created_at, new Date(Date.now() + prepTime * 60 * 1000))) {
      throw new AppError(munchConstants.ERROR_CODES.ORDER_NOT_FOUND, 400, 'PREP_TIME_EXCEEDED', null, { orderId });
    }

    if (order.dietary_requirements && !driverConstants.MUNUCH_DELIVERY_CONSTANTS.DELIVERY_SETTINGS.ALLOWED_DIETARY_FILTERS.every(filter => order.dietary_requirements.includes(filter))) {
      throw new AppError(driverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT, 400, null, null, { orderId });
    }

    await order.update({
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[3],
      staff_id: staffId,
      updated_at: getCurrentTimestamp()
    });

    logger.logApiEvent(munchConstants.AUDIT_TYPES.PROCESS_ORDER, { orderId, staffId, merchantId: order.merchant_id, customerId: order.customer_id });

    return order;
  } catch (error) {
    logger.logErrorEvent('Error preparing delivery package', { error: error.message, orderId, staffId });
    throw handleServiceError('prepareDeliveryPackage', error, error.code || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function trackDriverStatus(orderId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Staff, as: 'staff' },
        { model: DriverRatings, as: 'rating' }
      ]
    });
    if (!order || (!order.driver_id && !order.staff_id)) {
      throw new AppError(munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED, 404, null, null, { orderId });
    }

    const driver = order.driver_id ? order.driver : order.staff;
    const driverType = order.driver_id ? 'common' : 'staff';
    const driverId = driver.id;

    const status = {
      driverId,
      driverType,
      status: driverConstants.MUNUCH_DELIVERY_CONSTANTS.DELIVERY_STATUSES.includes(order.status) ? order.status : munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4],
      lastUpdated: formatDate(order.updated_at || getCurrentTimestamp()),
      location: driver.current_location || driver.work_location,
      rating: order.rating ? order.rating.rating : null
    };

    logger.logApiEvent(munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS, { orderId, driverId, driverType });

    return status;
  } catch (error) {
    logger.logErrorEvent('Error tracking driver status', { error: error.message, orderId });
    throw handleServiceError('trackDriverStatus', error, error.code || munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }
}

async function reassignDriver(orderId, staffId, newDriverId, driverType) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Staff, as: 'staff' },
        { model: Merchant, as: 'merchant' },
        { model: Customer, as: 'customer' }
      ]
    });
    if (!order) {
      throw new AppError(munchConstants.ERROR_CODES.ORDER_NOT_FOUND, 404, null, null, { orderId });
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staff.staff_types.includes(staffConstants.STAFF_ROLES.manager.name.toLowerCase())) {
      throw new AppError(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND, 404, 'INVALID_STAFF_TYPE', null, { staffId });
    }

    let newDriver;
    if (driverType === 'common') {
      newDriver = await Driver.findOne({
        where: {
          id: newDriverId,
          availability_status: driverConstants.DRIVER_STATUSES[0],
          status: driverConstants.DRIVER_STATUSES[0]
        },
        include: [{
          model: DriverAvailability,
          where: {
            status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0],
            isOnline: true,
            date: getCurrentTimestamp().split('T')[0]
          }
        }]
      });
      if (!newDriver) {
        throw new AppError(driverConstants.ERROR_CODES.DRIVER_NOT_FOUND, 404, null, null, { driverId: newDriverId });
      }
      const requiredCerts = driverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS;
      if (!newDriver.vehicle_info || !requiredCerts.every(cert => newDriver.vehicle_info[cert])) {
        throw new AppError(driverConstants.ERROR_CODES.CERTIFICATION_EXPIRED, 400, null, null, { driverId: newDriverId });
      }
    } else {
      newDriver = await Staff.findOne({
        where: {
          id: newDriverId,
          staff_types: { [Op.contains]: [staffConstants.STAFF_ROLE] },
          availability_status: driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]
        }
      });
      if (!newDriver) {
        throw new AppError(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND, 404, null, null, { staffId: newDriverId });
      }
      const requiredCerts = staffConstants.CERTIFICATIONS.REQUIRED;
      if (!newDriver.certifications || !requiredCerts.every(cert => newDriver.certifications.includes(cert))) {
        throw new AppError(staffConstants.ERROR_CODES[2], 400, null, null, { staffId: newDriverId });
      }
    }

    const maxShiftHours = driverType === 'common'
      ? driverConstants.AVAILABILITY_CONSTANTS.SHIFT_SETTINGS.MAX_SHIFT_HOURS
      : staffConstants.SHIFT_SETTINGS.MAX_SHIFT_HOURS;
    if (newDriver.current_shift_hours >= maxShiftHours) {
      throw new AppError(driverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT, 400, null, null, { driverId: newDriverId });
    }

    await order.update({
      driver_id: driverType === 'common' ? newDriverId : null,
      staff_id: driverType === 'staff' ? newDriverId : null,
      status: munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[4],
      updated_at: getCurrentTimestamp(),
      routing_info: {
        ...order.routing_info,
        routing_timestamp: getCurrentTimestamp(),
        routing_reason: `Reassigned to ${driverType} driver`
      }
    });

    const notification = {
      type: driverType === 'common'
        ? driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[1]
        : staffConstants.NOTIFICATION_CONSTANTS.TYPES[0],
      deliveryMethod: driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
      driverId: newDriverId,
      orderId
    };
    logger.logApiEvent(munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY, { ...notification, merchantId: order.merchant_id, customerId: order.customer_id });

    return { order, driver: newDriver, driverType };
  } catch (error) {
    logger.logErrorEvent('Error reassigning driver', { error: error.message, orderId, staffId, newDriverId });
    throw handleServiceError('reassignDriver', error, error.code || munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
  }
}

async function cancelDelivery(orderId, staffId, reason) {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Driver, as: 'driver' },
        { model: Staff, as: 'staff' },
        { model: Merchant, as: 'merchant' },
        { model: Customer, as: 'customer' }
      ]
    });
    if (!order) {
      throw new AppError(munchConstants.ERROR_CODES.ORDER_NOT_FOUND, 404, null, null, { orderId });
    }

    const staff = await Staff.findByPk(staffId);
    if (!staff || !staff.staff_types.includes(staffConstants.STAFF_ROLES.manager.name.toLowerCase())) {
      throw new AppError(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND, 404, 'INVALID_STAFF_TYPE', null, { staffId });
    }

    const cancellationWindow = driverConstants.MUNUCH_DELIVERY_CONSTANTS.DELIVERY_SETTINGS.CANCELLATION_WINDOW_MINUTES;
    if (order.created_at && !isWithinRange(new Date(), order.created_at, new Date(Date.now() + cancellationWindow * 60 * 1000))) {
      throw new AppError(munchConstants.ERROR_CODES.ORDER_NOT_FOUND, 400, 'CANCELLATION_WINDOW_EXCEEDED', null, { orderId });
    }

    await order.update({
      status: driverConstants.MUNUCH_DELIVERY_CONSTANTS.DELIVERY_STATUSES[5], // 'cancelled'
      driver_id: null,
      staff_id: null,
      updated_at: getCurrentTimestamp(),
      cancellation_info: {
        reason,
        timestamp: getCurrentTimestamp(),
        cancelledBy: staffId
      }
    });

    const notification = {
      type: driverConstants.NOTIFICATION_CONSTANTS.NOTIFICATION_TYPES[0], // 'ride_task_assigned' (used as a proxy for cancellation)
      deliveryMethod: driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS[0],
      orderId,
      message: `Delivery cancelled: ${reason}`
    };
    logger.logApiEvent(munchConstants.AUDIT_TYPES.CANCEL_DELIVERY, { ...notification, merchantId: order.merchant_id, customerId: order.customer_id });

    return order;
  } catch (error) {
    logger.logErrorEvent('Error cancelling delivery', { error: error.message, orderId, staffId });
    throw handleServiceError('cancelDelivery', error, error.code || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

module.exports = {
  assignDriver,
  prepareDeliveryPackage,
  trackDriverStatus,
  reassignDriver,
  cancelDelivery
};