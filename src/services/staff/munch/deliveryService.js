// deliveryService.js
// Manages delivery operations for munch staff. Handles driver assignments, package preparation, and driver tracking.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { Order, Driver, Staff, DriverAvailability } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function assignDriver(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['driver'] });
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const availableDriver = await Driver.findOne({
      where: { availability_status: 'available' },
      include: [{ model: DriverAvailability, where: { status: 'available', isOnline: true } }],
    });
    if (!availableDriver) throw new Error(munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);

    await order.update({
      driver_id: availableDriver.id,
      status: munchConstants.ORDER_STATUSES[4], // 'out_for_delivery'
      updated_at: new Date(),
    });

    return { order, driver: availableDriver };
  } catch (error) {
    logger.error('Error assigning driver', { error: error.message, orderId });
    throw error;
  }
}

async function prepareDeliveryPackage(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    await order.update({
      status: munchConstants.ORDER_STATUSES[3], // 'ready'
      updated_at: new Date(),
    });

    return order;
  } catch (error) {
    logger.error('Error preparing delivery package', { error: error.message, orderId });
    throw error;
  }
}

async function trackDriverStatus(orderId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['driver'] });
    if (!order || !order.driver_id) throw new Error(munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);

    const status = {
      driverId: order.driver_id,
      status: order.status,
      lastUpdated: order.updated_at || new Date(),
    };

    return status;
  } catch (error) {
    logger.error('Error tracking driver status', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  assignDriver,
  prepareDeliveryPackage,
  trackDriverStatus,
};