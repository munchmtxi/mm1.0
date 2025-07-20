'use strict';

const { Order, Customer, Driver, Route, sequelize } = require('@models');
const munchConstants = require('@constants/common/munchConstants');
const driverConstants = require('@constants/driver/driverConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');

async function acceptDelivery(deliveryId, driverId) {
  try {
    const order = await Order.findByPk(deliveryId, { include: [{ model: Customer, as: 'customer' }] });
    if (!order) {
      throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (order.status !== munchConstants.ORDER_STATUSES.ready || order.driver_id) {
      throw new AppError('Delivery cannot be accepted', 400, munchConstants.ERROR_CODES.NO_DRIVER_ASSIGNED);
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver || driver.availability_status !== driverConstants.AVAILABILITY_CONSTANTS.AVAILABILITY_STATUSES.available) {
      throw new AppError('Driver unavailable', 400, driverConstants.ERROR_CODES.DRIVER_NOT_FOUND);
    }

    // Validate driver certifications
    const requiredCerts = driverConstants.PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS;
    if (!driver.certifications || !requiredCerts.every(cert => driver.certifications.includes(cert))) {
      throw new AppError('Missing required certifications', 400, driverConstants.ERROR_CODES.CERTIFICATION_EXPIRED);
    }

    // Check vehicle suitability for large/fragile orders
    const isLargeOrder = order.items.some(item => item.size === 'large' || item.weight > 10);
    const isFragile = order.items.some(item => item.is_fragile);
    const vehicleType = driver.vehicle_info.type;
    if (isLargeOrder && !['van', 'truck'].includes(vehicleType)) {
      throw new AppError('Vehicle unsuitable for large order', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
    }
    if (isFragile && !driver.vehicle_info.has_secure_compartment) {
      throw new AppError('Vehicle lacks secure compartment for fragile items', 400, driverConstants.ERROR_CODES.INVALID_VEHICLE_TYPE);
    }

    // Validate dietary preferences
    const dietaryFilters = customerConstants.MUNCH_CONSTANTS.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS;
    const invalidDietary = order.items.some(item => item.dietary && !dietaryFilters.includes(item.dietary));
    if (invalidDietary) {
      throw new AppError('Invalid dietary preferences', 400, customerConstants.ERROR_CODES.INVALID_DIETARY_FILTER);
    }

    const transaction = await sequelize.transaction();
    try {
      const sealId = `SEAL-${deliveryId}-${Date.now()}`;
      await order.update(
        {
          status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.accepted,
          driver_id: driverId,
          tamper_seal_id: sealId,
          updated_at: new Date(),
        },
        { transaction }
      );

      await transaction.commit();
      logger.logApiEvent('Delivery accepted', { deliveryId, driverId, sealId });
      return order;
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('acceptDelivery', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('acceptDelivery', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function getDeliveryDetails(deliveryId) {
  try {
    const order = await Order.findByPk(deliveryId, {
      include: [
        { model: Customer, as: 'customer', attributes: ['user_id', 'full_name', 'phone_number'] },
        { model: Route, as: 'route' },
      ],
    });
    if (!order) {
      throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const country = order.customer.country || localizationConstants.SUPPORTED_COUNTRIES[0];
    const currency = localizationConstants.COUNTRY_CURRENCY_MAP[country] || localizationConstants.DEFAULT_CURRENCY;

    logger.logApiEvent('Delivery details retrieved', { deliveryId });
    return {
      deliveryId: order.id,
      customer: order.customer,
      deliveryLocation: order.delivery_location,
      status: order.status,
      items: order.items,
      totalAmount: order.total_amount,
      currency,
      route: order.route,
      estimatedDeliveryTime: order.estimated_delivery_time,
      tamperSealId: order.tamper_seal_id,
      isFragile: order.items.some(item => item.is_fragile),
      isLarge: order.items.some(item => item.size === 'large' || item.weight > 10),
      dietaryPreferences: order.items.map(item => item.dietary).filter(Boolean),
    };
  } catch (error) {
    throw handleServiceError('getDeliveryDetails', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function updateDeliveryStatus(deliveryId, status, driverId) {
  try {
    const validStatuses = munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES;
    if (!Object.values(validStatuses).includes(status)) {
      throw new AppError('Invalid status', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const order = await Order.findByPk(deliveryId);
    if (!order) {
      throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (order.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }

    if (status === validStatuses.delivered && !order.tamper_seal_id) {
      throw new AppError('Tamper-proof seal verification required', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    const transaction = await sequelize.transaction();
    try {
      const updates = { status, updated_at: new Date() };
      if (status === validStatuses.delivered) {
        updates.actual_delivery_time = new Date();
        updates.tamper_seal_verified = true;
      }
      await order.update(updates, { transaction });

      await transaction.commit();
      logger.logApiEvent('Delivery status updated', { deliveryId, status });
      return { deliveryId, status };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('updateDeliveryStatus', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('updateDeliveryStatus', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function verifyTamperSeal(deliveryId, driverId, sealId) {
  try {
    const order = await Order.findByPk(deliveryId);
    if (!order) {
      throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (order.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    if (order.tamper_seal_id !== sealId) {
      throw new AppError('Invalid tamper-proof seal ID', 400, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }

    await order.update({ tamper_seal_verified: true });
    logger.logSecurityEvent('Tamper seal verified', { deliveryId, sealId });
    return { deliveryId, sealId, verified: true };
  } catch (error) {
    throw handleServiceError('verifyTamperSeal', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function reportDeliveryIssue(deliveryId, driverId, issueType, description) {
  try {
    const order = await Order.findByPk(deliveryId);
    if (!order) {
      throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (order.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    if (!driverConstants.SUPPORT_CONSTANTS.ISSUE_TYPES.includes(issueType)) {
      throw new AppError('Invalid issue type', 400, driverConstants.ERROR_CODES.INVALID_DELIVERY_ASSIGNMENT);
    }

    const transaction = await sequelize.transaction();
    try {
      await order.update(
        { issue: { type: issueType, description, reported_at: new Date() } },
        { transaction }
      );
      await transaction.commit();
      logger.logApiEvent('Delivery issue reported', { deliveryId, issueType, driverId });
      return { deliveryId, issueType, description, reportedAt: new Date() };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('reportDeliveryIssue', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('reportDeliveryIssue', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

async function cancelDelivery(deliveryId, driverId, reason) {
  try {
    const order = await Order.findByPk(deliveryId);
    if (!order) {
      throw new AppError('Delivery not found', 404, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
    if (order.driver_id !== driverId) {
      throw new AppError('Unauthorized driver', 403, driverConstants.ERROR_CODES.PERMISSION_DENIED);
    }
    if (order.status === munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.cancelled) {
      throw new AppError('Delivery already cancelled', 400, munchConstants.ERROR_CODES.ORDER_ALREADY_CANCELLED);
    }
    if (Date.now() - order.created_at.getTime() > munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.CANCELLATION_WINDOW_MINUTES * 60 * 1000) {
      throw new AppError('Cancellation window expired', 400, munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER);
    }

    const transaction = await sequelize.transaction();
    try {
      await order.update(
        {
          status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.cancelled,
          cancellation_reason: reason,
          updated_at: new Date(),
        },
        { transaction }
      );
      await transaction.commit();
      logger.logApiEvent('Delivery cancelled', { deliveryId, driverId, reason });
      return { deliveryId, status: munchConstants.DELIVERY_CONSTANTS.DELIVERY_STATUSES.cancelled, reason };
    } catch (error) {
      await transaction.rollback();
      throw handleServiceError('cancelDelivery', error, munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
    }
  } catch (error) {
    throw handleServiceError('cancelDelivery', error, error.errorCode || munchConstants.ERROR_CODES.ORDER_NOT_FOUND);
  }
}

module.exports = {
  acceptDelivery,
  getDeliveryDetails,
  updateDeliveryStatus,
  verifyTamperSeal,
  reportDeliveryIssue,
  cancelDelivery,
};