'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('@models');
const { Order, Driver, MerchantBranch, Customer, Address, DeliveryHotspot, Staff, Merchant } = sequelize.models;
const munchConstants = require('@constants/common/munchConstants');
const merchantConstants = require('@constants/merchant/merchantConstants');
const driverConstants = require('@constants/driver/driverConstants');
const staffConstants = require('@constants/staff/staffConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { AppError } = require('@utils/AppError');
const logger = require('@utils/logger');
const { formatDate, getTimeDifference, isWithinRange } = require('@utils/dateTimeUtils');

async function assignDelivery(orderId, driverId, staffId = null) {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId || !driverId) {
      throw new AppError('Invalid input: orderId and driverId required', 400, munchConstants.ERROR_CODES[0]);
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: MerchantBranch,
          as: 'branch',
          include: [
            { model: Address, as: 'addressRecord' },
            { model: Merchant, as: 'merchant' },
          ],
        },
        { model: Customer, as: 'customer', include: [{ model: Address, as: 'defaultAddress' }] },
      ],
      transaction,
    });
    if (!order) {
      throw new AppError('Order not found', 404, munchConstants.ERROR_CODES[0]);
    }
    if (!munchConstants.ORDER_CONSTANTS.ORDER_STATUSES.includes(order.status) || order.status !== 'ready') {
      throw new AppError('Invalid order status for assignment', 400, munchConstants.ERROR_CODES[0]);
    }
    if (!merchantConstants.MERCHANT_TYPES.includes(order.branch?.merchant?.type)) {
      throw new AppError('Invalid merchant type', 400, merchantConstants.ERROR_CODES[0]);
    }

    const driver = await Driver.findByPk(driverId, {
      include: [
        { model: DriverAvailability, as: 'availability' },
        { model: Address, as: 'user' },
      ],
      transaction,
    });
    if (!driver || !driverConstants.DRIVER_STATUSES.includes(driver.status) || driver.status !== 'available') {
      throw new AppError('Driver unavailable or not found', 400, driverConstants.ERROR_CODES[0]);
    }

    const now = new Date();
    const currentDate = formatDate(now, localizationConstants.LOCALIZATION_SETTINGS.DATE_FORMATS.US);
    const currentTime = now.toTimeString().split(' ')[0];
    const availability = driver.availability.find(
      (avail) =>
        avail.date === currentDate &&
        isWithinRange(currentTime, avail.start_time, avail.end_time) &&
        avail.status === driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES[0]
    );
    if (!availability) {
      throw new AppError('Driver unavailable at this time', 400, driverConstants.ERROR_CODES[2]);
    }

    // Validate certifications
    const requiredCertifications = driverConstants.CERTIFICATIONS.REQUIRED;
    const driverCertifications = driver.certifications || [];
    const missingCertifications = requiredCertifications.filter((cert) => !driverCertifications.includes(cert));
    if (missingCertifications.length > 0) {
      throw new AppError('Missing required driver certifications', 400, driverConstants.ERROR_CODES[9]);
    }

    // Validate driver is within delivery radius
    const branchLocation = order.branch?.addressRecord?.location;
    const driverLocation = driver.current_location;
    if (branchLocation && driverLocation) {
      const distance = calculateDistance(branchLocation, driverLocation);
      const maxRadius = Math.min(
        order.branch.delivery_radius,
        order.branch.merchant?.service_radius || munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.MAX_DELIVERY_RADIUS_KM
      );
      if (distance > maxRadius) {
        throw new AppError('Driver outside delivery radius', 400, munchConstants.ERROR_CODES[0]);
      }
    }

    // Check delivery hotspots
    const hotspots = await DeliveryHotspot.findAll({
      where: { totalDeliveries: { [Op.gt]: 0 } },
      transaction,
    });
    const isInHotspot = hotspots.some((hotspot) => {
      const hotspotCenter = hotspot.center;
      const distance = calculateDistance(hotspotCenter, driver.current_location);
      return distance <= hotspot.radius;
    });

    // Validate staff if provided
    let staff = null;
    if (staffId) {
      staff = await Staff.findByPk(staffId, {
        include: [
          { model: MerchantBranch, as: 'branch' },
          { model: Merchant, as: 'merchant' },
        ],
        transaction,
      });
      if (
        !staff ||
        !staffConstants.STAFF_STATUSES.includes(staff.status) ||
        staff.status !== 'active' ||
        staff.branch_id !== order.branch_id ||
        !staffConstants.STAFF_ROLES.packager.supportedMerchantTypes.includes(order.branch?.merchant?.type)
      ) {
        throw new AppError('Invalid or unavailable staff', 400, staffConstants.ERROR_CODES[0]);
      }
    }

    // Update order
    await order.update(
      {
        driver_id: driverId,
        staff_id: staffId,
        status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES[2], // picked_up
        routing_info: {
          ...order.routing_info,
          driver_assigned_at: formatDate(now),
          hotspot_assigned: isInHotspot,
          staff_assigned: !!staffId,
          merchant_id: order.branch?.merchant?.id,
          currency: localizationConstants.COUNTRY_CURRENCY_MAP[order.branch?.merchant?.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
        },
      },
      { transaction }
    );

    // Log audit
    logger.logApiEvent('Delivery assigned', {
      audit_type: munchConstants.AUDIT_TYPES.ASSIGN_DELIVERY,
      orderId,
      driverId,
      staffId,
      merchantId: order.branch?.merchant?.id,
    });

    await transaction.commit();
    logger.info('Delivery assigned', { orderId, driverId, staffId, hotspot_assigned: isInHotspot });
    return {
      orderId,
      status: order.status,
      driverId,
      staffId,
      hotspot_assigned: isInHotspot,
      merchantName: order.branch?.merchant?.business_name,
      success_message: munchConstants.SUCCESS_MESSAGES[2], // Delivery tracked
    };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error assigning delivery', { error: error.message, orderId, driverId });
    throw error;
  }
}

async function trackDeliveryStatus(orderId) {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId) {
      throw new AppError('Invalid input: orderId required', 400, munchConstants.ERROR_CODES[0]);
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Driver,
          as: 'driver',
          include: [
            { model: Address, as: 'user' },
            { model: DriverAvailability, as: 'availability' },
          ],
        },
        { model: Customer, as: 'customer', include: [{ model: Address, as: 'defaultAddress' }] },
        {
          model: MerchantBranch,
          as: 'branch',
          include: [
            { model: Address, as: 'addressRecord' },
            { model: Merchant, as: 'merchant' },
          ],
        },
        { model: Staff, as: 'staff' },
      ],
      transaction,
    });
    if (!order) {
      throw new AppError('Order not found', 404, munchConstants.ERROR_CODES[0]);
    }

    // Check hotspot for delivery location
    const hotspots = await DeliveryHotspot.findAll({
      where: { totalDeliveries: { [Op.gt]: 0 } },
      transaction,
    });
    const isInHotspot = hotspots.some((hotspot) => {
      const hotspotCenter = hotspot.center;
      const deliveryLocation = order.delivery_location || order.customer?.defaultAddress?.location;
      const distance = calculateDistance(hotspotCenter, deliveryLocation);
      return distance <= hotspot.radius;
    });

    // Calculate estimated delivery time if not set
    let estimatedDeliveryTime = order.estimated_delivery_time;
    if (!estimatedDeliveryTime && order.driver?.current_location && order.delivery_location) {
      const distance = calculateDistance(order.driver.current_location, order.delivery_location);
      const avgSpeedKmh = 30; // Assume average delivery speed
      const estimatedMinutes = (distance / avgSpeedKmh) * 60;
      estimatedDeliveryTime = formatDate(
        addDaysToDate(new Date(), estimatedMinutes / (24 * 60)),
        localizationConstants.LOCALIZATION_SETTINGS.DATE_FORMATS.US
      );
    }

    const status = {
      orderId,
      status: order.status,
      driverId: order.driver_id,
      driverName: order.driver?.name || null,
      driverPhone: order.driver ? order.driver.format_phone_for_whatsapp() : null,
      driverLocation: order.driver?.current_location?.coordinates || null,
      staffId: order.staff_id,
      staffName: order.staff?.name || null,
      customerPhone: order.customer ? order.customer.format_phone_for_whatsapp() : null,
      customerAddress: order.customer?.defaultAddress?.formattedAddress || order.delivery_location,
      branchAddress: order.branch?.addressRecord?.formattedAddress || null,
      merchantName: order.branch?.merchant?.business_name || null,
      merchantPhone: order.branch?.merchant ? order.branch.merchant.format_phone_for_whatsapp() : null,
      estimatedDeliveryTime,
      actualDeliveryTime: order.actual_delivery_time,
      deliveryLocation: order.delivery_location,
      isInHotspot,
      isFeedbackRequested: order.is_feedback_requested,
      currency: localizationConstants.COUNTRY_CURRENCY_MAP[order.branch?.merchant?.country] || munchConstants.MUNCH_SETTINGS.DEFAULT_CURRENCY,
    };

    // Log audit
    logger.logApiEvent('Delivery status tracked', {
      audit_type: munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS,
      orderId,
      status: order.status,
    });

    await transaction.commit();
    logger.info('Delivery status tracked', { orderId, status: order.status });
    return status;
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error tracking delivery status', { error: error.message, orderId });
    throw error;
  }
}

async function communicateWithDriver(orderId, message, sender = 'system') {
  const transaction = await sequelize.transaction();

  try {
    if (!orderId || !message) {
      throw new AppError('Invalid input: orderId and message required', 400, munchConstants.ERROR_CODES[0]);
    }

    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Driver,
          as: 'driver',
          include: [{ model: Address, as: 'user' }],
        },
        {
          model: MerchantBranch,
          as: 'branch',
          include: [{ model: Merchant, as: 'merchant' }],
        },
        { model: Staff, as: 'staff' },
        { model: Customer, as: 'customer' },
      ],
      transaction,
    });
    if (!order || !order.driver) {
      throw new AppError('Order or driver not found', 404, munchConstants.ERROR_CODES[1]);
    }

    const sanitizedMessage = message.trim();
    if (!sanitizedMessage) {
      throw new AppError('Invalid message', 400, munchConstants.ERROR_CODES[0]);
    }

    // Log communication in routing_history
    const routingHistory = order.routing_history || [];
    routingHistory.push({
      timestamp: formatDate(new Date()),
      message: sanitizedMessage,
      from: sender === 'staff' && order.staff ? order.staff.name : order.branch?.merchant?.business_name || 'System',
      to: order.driver.name,
      type: munchConstants.NOTIFICATION_TYPES.DRIVER_COMMUNICATION,
    });

    await order.update({ routing_history }, { transaction });

    // Log audit
    logger.logApiEvent('Driver communication', {
      audit_type: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
      orderId,
      driverId: order.driver_id,
      message: sanitizedMessage,
    });

    await transaction.commit();
    logger.info('Driver communication initiated', { orderId, driverId: order.driver_id, message: sanitizedMessage });
    return {
      orderId,
      driverId: order.driver_id,
      driverPhone: order.driver.format_phone_for_whatsapp(),
      merchantName: order.branch?.merchant?.business_name,
      customerPhone: order.customer ? order.customer.format_phone_for_whatsapp() : null,
      message: sanitizedMessage,
      success_message: munchConstants.SUCCESS_MESSAGES[3], // Driver message sent
    };
  } catch (error) {
    await transaction.rollback();
    logger.logErrorEvent('Error communicating with driver', { error: error.message, orderId });
    throw error;
  }
}

function calculateDistance(loc1, loc2) {
  // Placeholder for Haversine formula or external map provider
  // Example: Use google_maps or openstreetmap based on localizationConstants.SUPPORTED_MAP_PROVIDERS
  return 0; // Implement based on requirements
}

module.exports = {
  assignDelivery,
  trackDeliveryStatus,
  communicateWithDriver,
};