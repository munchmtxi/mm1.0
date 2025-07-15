// coordinationService.js
// Manages delivery coordination for munch staff. Arranges driver pickups, verifies credentials, and logs pickup times.
// Last Updated: May 25, 2025

'use strict';

const { Op } = require('sequelize');
const { Order, Driver, Verification, TimeTracking, Staff, DriverAvailability } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const logger = require('@utils/logger');

async function coordinateDriverPickup(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, { include: ['customer', 'branch'] });
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const availableDriver = await Driver.findOne({
      where: { availability_status: 'available' },
      include: [{
        model: DriverAvailability,
        where: {
          status: 'available',
          isOnline: true,
          date: sequelize.literal('CURRENT_DATE'),
          start_time: { [Op.lte]: sequelize.literal('CURRENT_TIME') },
          end_time: { [Op.gte]: sequelize.literal('CURRENT_TIME') },
        },
      }],
    });
    if (!availableDriver) throw new Error(munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);

    await order.update({
      driver_id: availableDriver.id,
      status: munchConstants.ORDER_STATUSES[4], // 'out_for_delivery'
      updated_at: new Date(),
    });

    await DriverAvailability.update(
      { status: 'busy', lastUpdated: new Date() },
      { where: { driver_id: availableDriver.id, status: 'available' } }
    );

    return { order, driver: availableDriver };
  } catch (error) {
    logger.error('Error coordinating driver pickup', { error: error.message, orderId });
    throw error;
  }
}

async function verifyDriverCredentials(driverId, staffId) {
  try {
    const driver = await Driver.findByPk(driverId);
    if (!driver) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const verification = await Verification.create({
      user_id: driverId,
      role: 'driver',
      verification_type: 'identity',
      status: 'verified',
      details: { driverId, verifiedBy: staffId },
      verified_by: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return verification;
  } catch (error) {
    logger.error('Error verifying driver credentials', { error: error.message, driverId });
    throw error;
  }
}

async function logPickupTime(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId);
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId);
    if (!staff) throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);

    const pickupTime = new Date();
    const timeTracking = await TimeTracking.create({
      staff_id: staffId,
      clock_in: pickupTime,
      duration: 0,
      created_at: pickupTime,
      updated_at: pickupTime,
    });

    await order.update({
      status: munchConstants.DELIVERY_STATUSES[2], // 'picked_up'
      updated_at: pickupTime,
    });

    return timeTracking;
  } catch (error) {
    logger.error('Error logging pickup time', { error: error.message, orderId });
    throw error;
  }
}

module.exports = {
  coordinateDriverPickup,
  verifyDriverCredentials,
  logPickupTime,
};