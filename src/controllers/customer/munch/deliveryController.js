'use strict';

/**
 * Delivery Controller
 * Handles HTTP requests for delivery operations, integrating with deliveryService, notificationService,
 * socketService, locationService, mapService, pointService, auditService, and localization utilities.
 * Supports customer and driver roles with proper authorization, error handling, gamification, and map integration.
 * Last Updated: July 05, 2025
 */

const { Op } = require('sequelize');
const deliveryService = require('@services/customer/deliveryService');
const notificationService = require('@services/common/notificationService');
const socketService = require('@services/common/socketService');
const locationService = require('@services/common/locationService');
const mapService = require('@services/common/mapService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Order, Customer, Driver, User } = require('@models');
const munchConstants = require('@constants/customer/munch/munchConstants');
const driverConstants = require('@constants/driver/driverConstants');
const customerConstants = require('@constants/customer/customerConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const socketConstants = require('@constants/common/socketConstants');
const catchAsync = require('@utils/catchAsync');

module.exports = {
  /**
   * Tracks the status of a delivery order.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  trackDelivery: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (!['customer', 'driver'].includes(role)) {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        role === 'customer' ? customerConstants.ERROR_CODES.PERMISSION_DENIED : driverConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] },
        { model: Driver, as: 'driver', include: [{ model: User, as: 'user' }] },
      ],
    });

    if (!order || (role === 'customer' && order.customer.user_id !== userId) || (role === 'driver' && order.driver_id !== userId)) {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.order_not_found'),
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND
      );
    }

    const status = await deliveryService.trackDeliveryStatus(orderId);

    // Fetch detailed delivery location using mapService
    let deliveryLocationDetails = null;
    if (order.delivery_location?.placeId) {
      deliveryLocationDetails = await mapService.getPlaceDetails(
        order.delivery_location.placeId,
        order.delivery_location.countryCode || 'US',
        req.sessionToken
      );
    }

    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.TRACK_DELIVERY_STATUS,
      details: { orderId, status: status.status, deliveryLocation: deliveryLocationDetails?.formattedAddress },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: formatMessage(role, 'delivery', languageCode, 'success.order_tracked'),
      data: { ...status, deliveryLocationDetails },
    });
  }),

  /**
   * Cancels a delivery order.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  cancelDelivery: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { reason } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'customer') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const transaction = await Order.sequelize.transaction();
    try {
      const result = await deliveryService.cancelDelivery(orderId, userId, reason, transaction);

      await pointService.awardPoints(userId, customerConstants.GAMIFICATION_ACTIONS.munch.find(a => a.action === 'order_cancelled').action, 5, {
        io: req.io,
        role: 'customer',
        languageCode,
        walletId: result.wallet?.id,
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.ORDER_CANCELLED, {
        userId,
        role: 'customer',
        orderId,
        reason,
        refundProcessed: result.refundProcessed,
        auditAction: munchConstants.AUDIT_TYPES.RESOLVE_ORDER_DISPUTE,
      }, `driver:${result.order.driver_id}`, languageCode);

      await auditService.logAction({
        userId,
        role,
        action: munchConstants.AUDIT_TYPES.RESOLVE_ORDER_DISPUTE,
        details: { orderId, reason, refundProcessed: result.refundProcessed },
        ipAddress: req.ip,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage(role, 'delivery', languageCode, 'success.order_cancelled'),
        data: {
          orderId,
          refundProcessed: result.refundProcessed,
          refundAmount: result.refundAmount,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error instanceof AppError
        ? error
        : new AppError(
            formatMessage(role, 'delivery', languageCode, 'error.order_cancellation_failed'),
            500,
            munchConstants.ERROR_CODES.CANNOT_CANCEL_ORDER
          );
    }
  }),

  /**
   * Sends a message to the driver.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  communicateWithDriver: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { message } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'customer') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const result = await deliveryService.communicateWithDriver(orderId, userId, message);

    await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.DRIVER_COMMUNICATION, {
      userId,
      role: 'customer',
      orderId,
      message,
      auditAction: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
    }, `driver:${result.order.driver_id}`, languageCode);

    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.COMMUNICATE_WITH_DRIVER,
      details: { orderId, messageLength: message.length },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: formatMessage(role, 'delivery', languageCode, 'success.message_sent'),
      data: result,
    });
  }),

  /**
   * Requests feedback for a completed delivery.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  requestFeedback: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'customer') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const transaction = await Order.sequelize.transaction();
    try {
      const result = await deliveryService.requestDeliveryFeedback(orderId, userId, transaction);

      await pointService.awardPoints(userId, customerConstants.GAMIFICATION_ACTIONS.munch.find(a => a.action === 'feedback_requested').action, 10, {
        io: req.io,
        role: 'customer',
        languageCode,
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.FEEDBACK_REQUESTED, {
        userId,
        role: 'customer',
        orderId,
        auditAction: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
      }, 'admin', languageCode);

      await auditService.logAction({
        userId,
        role,
        action: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
        details: { orderId, action: 'feedback_requested' },
        ipAddress: req.ip,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage(role, 'delivery', languageCode, 'success.feedback_requested'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      throw error instanceof AppError
        ? error
        : new AppError(
            formatMessage(role, 'delivery', languageCode, 'error.feedback_request_failed'),
            500,
            munchConstants.ERROR_CODES.FEEDBACK_NOT_ALLOWED
          );
    }
  }),

  /**
   * Updates delivery status (driver only).
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  updateDeliveryStatus: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { status } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'driver') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        driverConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const transaction = await Order.sequelize.transaction();
    try {
      const result = await deliveryService.updateDeliveryStatus(orderId, userId, status, transaction);

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.DELIVERY_STATUS_UPDATED, {
        userId,
        role: 'driver',
        orderId,
        status,
        auditAction: munchConstants.AUDIT_TYPES.UPDATE_ORDER_STATUS,
      }, `customer:${result.order.customer_id}`, languageCode);

      await auditService.logAction({
        userId,
        role,
        action: munchConstants.AUDIT_TYPES.UPDATE_ORDER_STATUS,
        details: { orderId, status },
        ipAddress: req.ip,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage(role, 'delivery', languageCode, 'success.status_updated'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      throw error instanceof AppError
        ? error
        : new AppError(
            formatMessage(role, 'delivery', languageCode, 'error.status_update_failed'),
            500,
            munchConstants.ERROR_CODES.INVALID_DELIVERY_STATUS
          );
    }
  }),

  /**
   * Processes driver earnings after delivery completion.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  processDriverEarnings: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'driver') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        driverConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const transaction = await Order.sequelize.transaction();
    try {
      const result = await deliveryService.processDriverEarnings(orderId, userId, transaction);

      await pointService.awardPoints(userId, driverConstants.GAMIFICATION_ACTIONS.DELIVERY_COMPLETED.action, 20, {
        io: req.io,
        role: 'driver',
        languageCode,
        walletId: result.wallet?.id,
      });

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.EARNINGS_PROCESSED, {
        userId,
        role: 'driver',
        orderId,
        earningAmount: result.earningAmount,
        auditAction: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2],
      }, `driver:${userId}`, languageCode);

      await auditService.logAction({
        userId,
        role,
        action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[2],
        details: { orderId, earningAmount: result.earningAmount },
        ipAddress: req.ip,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage(role, 'delivery', languageCode, 'success.earnings_processed'),
        data: result,
      });
    } catch (error) {
      await transaction.rollback();
      throw error instanceof AppError
        ? error
        : new AppError(
            formatMessage(role, 'delivery', languageCode, 'error.earnings_processing_failed'),
            500,
            driverConstants.ERROR_CODES.WALLET_INSUFFICIENT_FUNDS
          );
    }
  }),

  /**
   * Updates driver location during delivery.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  updateDriverLocation: catchAsync(async (req, res, next) => {
    const { coordinates, countryCode } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'driver') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        driverConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const resolvedLocation = await mapService.resolveLocation(
      { coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude } },
      countryCode,
      req.sessionToken
    );

    const updatedLocation = await mapService.updateEntityLocation(
      req.io,
      userId,
      'driver',
      resolvedLocation.coordinates,
      countryCode
    );

    await auditService.logAction({
      userId,
      role,
      action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES[1], // location_updated
      details: { coordinates: resolvedLocation.coordinates, countryCode },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: formatMessage(role, 'delivery', languageCode, 'success.location_updated'),
      data: updatedLocation,
    });
  }),

  /**
   * Retrieves address predictions for delivery location input.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  getAddressPredictions: catchAsync(async (req, res, next) => {
    const { input, countryCode = 'US' } = req.query;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'customer') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const predictions = await mapService.getAddressPredictions(input, countryCode, req.sessionToken);

    await auditService.logAction({
      userId,
      role,
      action: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
      details: { input, countryCode, predictionCount: predictions.length },
      ipAddress: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: formatMessage(role, 'delivery', languageCode, 'success.address_predictions_retrieved'),
      data: predictions,
    });
  }),

  /**
   * Updates delivery location for an order.
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware
   */
  updateDeliveryLocation: catchAsync(async (req, res, next) => {
    const { orderId } = req.params;
    const { placeId, countryCode = 'US' } = req.body;
    const { userId, role, languageCode = localizationConstants.DEFAULT_LANGUAGE } = req.user;

    if (role !== 'customer') {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.permission_denied'),
        403,
        customerConstants.ERROR_CODES.PERMISSION_DENIED
      );
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: Customer, as: 'customer', include: [{ model: User, as: 'user' }] }],
    });

    if (!order || order.customer.user_id !== userId) {
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.order_not_found'),
        404,
        munchConstants.ERROR_CODES.ORDER_NOT_FOUND
      );
    }

    if (order.status !== munchConstants.ORDER_CONSTANTS.ORDER_STATUSES[0]) { // pending
      throw new AppError(
        formatMessage(role, 'delivery', languageCode, 'error.cannot_update_location'),
        400,
        munchConstants.ERROR_CODES.CANNOT_UPDATE_ORDER
      );
    }

    const transaction = await Order.sequelize.transaction();
    try {
      const locationDetails = await mapService.getPlaceDetails(placeId, countryCode, req.sessionToken);

      await order.update(
        {
          delivery_location: {
            placeId: locationDetails.placeId,
            formattedAddress: locationDetails.formattedAddress,
            coordinates: {
              latitude: locationDetails.latitude,
              longitude: locationDetails.longitude,
            },
            countryCode: locationDetails.countryCode,
          },
          updated_at: new Date(),
        },
        { transaction }
      );

      await socketService.emit(req.io, socketConstants.SOCKET_EVENT_TYPES.DELIVERY_LOCATION_UPDATED, {
        userId,
        role: 'customer',
        orderId,
        location: locationDetails,
        auditAction: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
      }, `driver:${order.driver_id}`, languageCode);

      await auditService.logAction({
        userId,
        role,
        action: munchConstants.AUDIT_TYPES.HANDLE_ORDER_INQUIRY,
        details: { orderId, placeId, formattedAddress: locationDetails.formattedAddress },
        ipAddress: req.ip,
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: formatMessage(role, 'delivery', languageCode, 'success.location_updated'),
        data: { orderId, location: locationDetails },
      });
    } catch (error) {
      await transaction.rollback();
      throw error instanceof AppError
        ? error
        : new AppError(
            formatMessage(role, 'delivery', languageCode, 'error.location_update_failed'),
            500,
            munchConstants.ERROR_CODES.INVALID_LOCATION
          );
    }
  }),
};