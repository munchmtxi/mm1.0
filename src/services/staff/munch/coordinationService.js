// coordinationService.js
// Manages delivery coordination for munch staff. Arranges driver pickups, verifies credentials, and logs pickup times.
// Last Updated: July 15, 2025

'use strict';

const { Op } = require('sequelize');
const { Order, Driver, Verification, TimeTracking, Staff, DriverAvailability, Merchant, DriverRatings } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const staffConstants = require('@constants/staff/staffConstants');
const staffDriverConstants = require('@constants/staff/driverConstants');
const commonDriverConstants = require('@constants/driver/driverConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const logger = require('@utils/logger');

async function coordinateDriverPickup(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: ['customer', 'branch', 'staff', { model: Merchant, as: 'merchant' }],
    });
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, {
      include: ['user', { model: Merchant, as: 'merchant' }],
    });
    if (
      !staff ||
      !staff.staff_types.includes('coordinator') ||
      staff.availability_status !== 'available'
    ) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    if (
      order.merchant &&
      !staffDriverConstants.SUPPORTED_MERCHANT_TYPES.includes(order.merchant.business_type)
    ) {
      throw new Error(merchantConstants.ERROR_CODES.INVALID_MERCHANT_TYPE);
    }

    let driver, isStaffDriver = false, driverConstants;
    if (order.merchant?.business_type_details?.useStaffDrivers) {
      driverConstants = staffDriverConstants;
      driver = await Staff.findOne({
        where: {
          merchant_id: order.merchant_id,
          staff_types: { [Op.contains]: [staffDriverConstants.STAFF_ROLE] },
          availability_status: 'available',
        },
        include: [
          {
            model: DriverAvailability,
            where: {
              status: 'available',
              isOnline: true,
              date: sequelize.literal('CURRENT_DATE'),
              start_time: { [Op.lte]: sequelize.literal('CURRENT_TIME') },
              end_time: { [Op.gte]: sequelize.literal('CURRENT_TIME') },
            },
          },
        ],
      });
      isStaffDriver = true;
    } else {
      driverConstants = commonDriverConstants;
      driver = await Driver.findOne({
        where: {
          availability_status: commonDriverConstants.DRIVER_STATUSES[0], // available
          status: 'active',
        },
        include: [
          {
            model: DriverAvailability,
            where: {
              status: commonDriverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0], // available
              isOnline: true,
              date: sequelize.literal('CURRENT_DATE'),
              start_time: { [Op.lte]: sequelize.literal('CURRENT_TIME') },
              end_time: { [Op.gte]: sequelize.literal('CURRENT_TIME') },
            },
          },
          { model: DriverRatings, as: 'ratings' },
        ],
      });
      if (driver) {
        const avgRating = await DriverRatings.findOne({
          attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
          where: { driver_id: driver.id },
        });
        if (avgRating && avgRating.dataValues.avgRating < 3.0) {
          throw new Error(commonDriverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT);
        }
      }
    }

    if (!driver) throw new Error(munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);

    await order.update({
      driver_id: driver.id,
      staff_id: staffId,
      status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES[2], // picked_up
      updated_at: new Date(),
    });

    await DriverAvailability.update(
      { status: isStaffDriver ? 'busy' : commonDriverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[1], lastUpdated: new Date() },
      { where: { driver_id: driver.id, status: 'available' } }
    );

    logger.info(driverConstants.SUCCESS_MESSAGES[isStaffDriver ? 0 : 2], { orderId, driverId: driver.id }); // delivery_completed
    return { order, driver, isStaffDriver };
  } catch (error) {
    logger.error('Error coordinating driver pickup', {
      error: error.message,
      orderId,
      staffId,
    });
    throw error;
  }
}

async function verifyDriverCredentials(driverId, staffId, isStaffDriver = false) {
  try {
    const staff = await Staff.findByPk(staffId, {
      include: ['user', { model: Merchant, as: 'merchant' }],
    });
    if (
      !staff ||
      !staff.staff_types.includes('coordinator') ||
      !staff.permissions.includes('verify_driver_credentials')
    ) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.PERMISSION_DENIED);
    }

    const driverConstants = isStaffDriver ? staffDriverConstants : commonDriverConstants;
    let driver;
    if (isStaffDriver) {
      driver = await Staff.findByPk(driverId, {
        include: ['user', { model: Merchant, as: 'merchant' }],
      });
      if (
        !driver ||
        !driver.staff_types.includes(staffDriverConstants.STAFF_ROLE) ||
        !staffDriverConstants.CERTIFICATIONS.REQUIRED.every(cert => driver.certifications?.includes(cert))
      ) {
        throw new Error(staffDriverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT);
      }
    } else {
      driver = await Driver.findByPk(driverId, {
        include: ['user', { model: DriverRatings, as: 'ratings' }],
      });
      if (
        !driver ||
        !commonDriverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS.every(cert => driver.vehicle_info?.certifications?.includes(cert))
      ) {
        throw new Error(commonDriverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT);
      }
    }

    const verification = await Verification.create({
      user_id: driver.user_id,
      method: 'identity',
      status: 'verified',
      document_type: 'drivers_license',
      document_url: driver.license_picture_url || 'default_url',
      details: { driverId, verifiedBy: staffId, isStaffDriver },
      verified_by: staffId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info(driverConstants.SUCCESS_MESSAGES[isStaffDriver ? 1 : 8], { driverId }); // order_handed_over or certification_uploaded
    return verification;
  } catch (error) {
    logger.error('Error verifying driver credentials', {
      error: error.message,
      driverId,
      staffId,
    });
    throw error;
  }
}

async function logPickupTime(orderId, staffId) {
  try {
    const order = await Order.findByPk(orderId, {
      include: ['customer', 'driver', 'staff', { model: Merchant, as: 'merchant' }],
    });
    if (!order) throw new Error(munchConstants.ERROR_CODES.ORDER_NOT_FOUND);

    const staff = await Staff.findByPk(staffId, {
      include: ['user', { model: Merchant, as: 'merchant' }],
    });
    if (
      !staff ||
      !staff.staff_types.includes('coordinator') ||
      staff.availability_status !== 'available'
    ) {
      throw new Error(staffConstants.STAFF_ERROR_CODES.STAFF_NOT_FOUND);
    }

    const pickupTime = new Date();
    const timeTracking = await TimeTracking.create({
      staff_id: staffId,
      clock_in: pickupTime,
      duration: 0,
      created_at: pickupTime,
      updated_at: pickupTime,
    });

    await order.update({
      staff_id: staffId,
      status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES[2], // picked_up
      actual_delivery_time: pickupTime,
      updated_at: pickupTime,
    });

    logger.info(staffDriverConstants.SUCCESS_MESSAGES[0], { orderId }); // delivery_completed
    return timeTracking;
  } catch (error) {
    logger.error('Error logging pickup time', {
      error: error.message,
      orderId,
      staffId,
    });
    throw error;
  }
}

module.exports = {
  coordinateDriverPickup,
  verifyDriverCredentials,
  logPickupTime,
};