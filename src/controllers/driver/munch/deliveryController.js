'use strict';

const deliveryService = require('@services/driver/munch/deliveryService');
const socketService = require('@services/common/socketService');
const notificationService = require('@services/common/notificationService');
const auditService = require('@services/common/auditService');
const pointService = require('@services/common/pointService');
const { formatMessage } = require('@utils/localization');
const driverConstants = require('@constants/driverConstants');
const munchConstants = require('@constants/common/munchConstants');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

async function acceptDelivery(req, res, next) {
  try {
    const { deliveryId } = req.params;
    const driverId = req.user.driverId;
    const order = await deliveryService.acceptDelivery(deliveryId, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      data: order,
      message: formatMessage(
        'driver',
        'delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'delivery.accepted',
        { deliveryId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function getDeliveryDetails(req, res, next) {
  try {
    const { deliveryId } = req.params;
    const deliveryDetails = await deliveryService.getDeliveryDetails(deliveryId, auditService, pointService);

    res.status(200).json({
      status: 'success',
      data: deliveryDetails,
    });
  } catch (error) {
    next(error);
  }
}

async function updateDeliveryStatus(req, res, next) {
  try {
    const { deliveryId, status } = req.body;
    const driverId = req.user.driverId;

    await deliveryService.updateDeliveryStatus(deliveryId, status, driverId, auditService, notificationService, socketService, pointService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'delivery.status_updated',
        { deliveryId, status }
      ),
    });
  } catch (error) {
    next(error);
  }
}

async function communicateWithCustomer(req, res, next) {
  try {
    const { deliveryId, message } = req.body;
    const driverId = req.user.driverId;

    await deliveryService.communicateWithCustomer(deliveryId, message, driverId, auditService, notificationService, socketService);

    res.status(200).json({
      status: 'success',
      message: formatMessage(
        'driver',
        'delivery',
        munchConstants.MUNCH_SETTINGS.DEFAULT_LANGUAGE,
        'delivery.message_sent',
        { deliveryId }
      ),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  acceptDelivery,
  getDeliveryDetails,
  updateDeliveryStatus,
  communicateWithCustomer,
};