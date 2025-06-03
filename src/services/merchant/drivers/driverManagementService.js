// src/services/driverManagementService.js
'use strict';

const { Op } = require('sequelize');
const { Driver, Order, Wallet, WalletTransaction, Task, Vehicle, Route } = require('@models');
const driverConstants = require('@constants/driverConstants');
const staffConstants = require('@constants/staffRolesConstants');
const events = require('../events');
const notificationService = require('@services/common/notificationService');
const pointService = require('@services/common/pointService');
const auditService = require('@services/common/auditService');
const locationService = require('@services/common/locationService');
const socketService = require('@services/common/socketService');
const { formatMessage } = require('@utils/localization/localization');
const AppError = require('@utils/AppError');
const { handleServiceError } = require('@utils/errorHandling');
const logger = require('@utils/logger');

const emitter = new events.DriverEventEmitter();

class DriverManagementService {
  static async assignDeliveryTask(driverId, orderId, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId, { include: [{ model: Vehicle, as: 'vehicles' }] });
      if (!driver || driver.status !== driverConstants.DRIVER_STATUSES.AVAILABLE) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.driverNotFound'),
          404,
          events.ERROR_CODES.DRIVER_NOT_FOUND
        );
      }

      const order = await Order.findByPk(orderId, { include: [{ model: Route, as: 'route' }] });
      if (!order || order.status !== 'ready') {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.orderNotReady'),
          400,
          events.ERROR_CODES.ORDER_NOT_READY
        );
      }

      if (!order.route_id || !order.route) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.routeNotFound'),
          400,
          events.ERROR_CODES.ROUTE_NOT_FOUND
        );
      }

      await order.update({
        driver_id: driverId,
        status: 'out_for_delivery',
        staff_id: driver.merchant_id ? driver.user_id : null,
      });
      await driver.update({
        status: driverConstants.DRIVER_STATUSES.ON_DELIVERY,
        active_route_id: order.route_id,
      });

      const task = await Task.create({
        staff_id: driver.user_id,
        branch_id: order.branch_id,
        task_type: 'delivery',
        description: formatMessage('driver', 'notifications', driver.preferred_language || events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.deliveryTaskAssigned', { orderNumber: order.order_number }),
        status: staffConstants.STAFF_TASK_STATUSES.ASSIGNED,
        due_date: order.estimated_delivery_time || new Date(Date.now() + 3600000),
      });

      await notificationService.sendNotification({
        userId: driver.user_id,
        notificationType: events.NOTIFICATION_TYPES.DELIVERY_TASK_ASSIGNED,
        messageKey: 'driverManagement.deliveryTaskAssigned',
        messageParams: { orderNumber: order.order_number },
        deliveryMethod: driverConstants.NOTIFICATION_CONSTANTS.DELIVERY_METHODS.PUSH,
        priority: driverConstants.NOTIFICATION_CONSTANTS.PRIORITY_LEVELS.HIGH,
        orderId,
        role: 'driver',
        module: 'notifications',
      });

      await auditService.logAction({
        userId: driver.user_id,
        role: 'driver',
        action: events.AUDIT_TYPES.DELIVERY_ASSIGNED,
        details: { driverId, orderId, taskId: task.id, orderNumber: order.order_number },
        ipAddress,
      });

      socketService.emit(null, events.EVENT_TYPES.DELIVERY_TASK_ASSIGNED, {
        userId: driver.user_id,
        orderId,
        taskId: task.id,
        orderNumber: order.order_number,
      });

      emitter.emit(events.EVENT_TYPES.DELIVERY_TASK_ASSIGNED, {
        driverId,
        orderId,
        orderNumber: order.order_number,
        ipAddress,
      });

      logger.info(`Delivery task assigned: driver ${driverId}, order ${orderId}`);
      return { task, order };
    } catch (error) {
      throw handleServiceError('assignDeliveryTask', error, events.ERROR_CODES.EVENT_PROCESSING_FAILED);
    }
  }

  static async verifyDriverCompliance(driverId, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId, { include: [{ model: Vehicle, as: 'vehicles' }] });
      if (!driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.driverNotFound'),
          404,
          events.ERROR_CODES.DRIVER_NOT_FOUND
        );
      }

      const isMerchantAttached = driver.merchant_id !== null;
      const requiredCertifications = isMerchantAttached
        ? staffConstants.STAFF_PROFILE_CONSTANTS.REQUIRED_CERTIFICATIONS['driver'] || [driverConstants.PROFILE_CONSTANTS.CERTIFICATIONS.DRIVERS_LICENSE]
        : [driverConstants.PROFILE_CONSTANTS.CERTIFICATIONS.DRIVERS_LICENSE, driverConstants.PROFILE_CONSTANTS.CERTIFICATIONS.VEHICLE_INSURANCE];

      const compliance = {
        licenseValid: !!driver.license_number,
        vehicleRegistered: driver.vehicles && driver.vehicles.length > 0,
        phoneVerified: !!driver.phone_number,
        certificationsValid: requiredCertifications.every(cert => driver.certifications?.includes(cert)),
      };

      const status = Object.values(compliance).every(v => v) ? 'passed' : 'failed';

      await auditService.logAction({
        userId: driver.user_id,
        role: 'driver',
        action: status === 'passed' ? events.AUDIT_TYPES.COMPLIANCE_CHECK_PASSED : events.AUDIT_TYPES.COMPLIANCE_CHECK_FAILED,
        details: compliance,
        ipAddress,
      });

      if (!Object.values(compliance).every(v => v)) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.complianceCheckFailed'),
          400,
          events.ERROR_CODES.COMPLIANCE_CHECK_FAILED
        );
      }

      emitter.emit(events.EVENT_TYPES.COMPLIANCE_CHECK, {
        driverId,
        status,
        details: compliance,
        ipAddress,
      });

      logger.info(`Compliance verified for driver ${driverId}`);
      return compliance;
    } catch (error) {
      throw handleServiceError('verifyDriverCompliance', error, events.ERROR_CODES.EVENT_PROCESSING_FAILED);
    }
  }

  static async monitorDriverPerformance(driverId, startDate, endDate, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.driverNotFound'),
          404,
          events.ERROR_CODES.DRIVER_NOT_FOUND
        );
      }

      const orders = await Order.findAll({
        where: {
          driver_id: driverId,
          status: 'completed',
          created_at: { [Op.between]: [startDate, endDate] },
        },
      });

      const performance = {
        totalDeliveries: orders.length,
        averageDeliveryTime: orders.reduce((sum, order) => {
          const time = order.actual_delivery_time ? (order.actual_delivery_time - order.created_at) / 60000 : 0;
          return sum + time;
        }, 0) / (orders.length || 1),
        rating: driver.rating || 0,
      };

      await auditService.logAction({
        userId: driver.user_id,
        role: 'driver',
        action: 'performance_monitored',
        details: performance,
        ipAddress,
      });

      logger.info(`Performance monitored for driver ${driverId}`);
      return performance;
    } catch (error) {
      throw handleServiceError('monitorDriverPerformance', error, events.ERROR_CODES.EVENT_PROCESSING_FAILED);
    }
  }

  static async awardGamificationPoints(driverId, action, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.driverNotFound'),
          404,
          events.ERROR_CODES.DRIVER_NOT_FOUND
        );
      }

      const isMerchantAttached = driver.merchant_id !== null;
      const role = isMerchantAttached ? 'staff' : 'driver';
      const subRole = isMerchantAttached ? 'driver' : null;

      const pointsRecord = await pointService.awardPoints({
        userId: driver.user_id,
        role,
        subRole,
        action,
        languageCode: driver.preferred_language || events.SETTINGS.DEFAULT_LANGUAGE,
      });

      await auditService.logAction({
        userId: driver.user_id,
        role,
        action: events.AUDIT_TYPES.GAMIFICATION_POINTS_AWARDED,
        details: { action, points: pointsRecord.points },
        ipAddress,
      });

      socketService.emit(null, events.EVENT_TYPES.GAMIFICATION_POINTS_AWARDED, {
        userId: driver.user_id,
        driverId,
        action,
        points: pointsRecord.points,
      });

      emitter.emit(events.EVENT_TYPES.GAMIFICATION_POINTS_AWARDED, {
        driverId,
        action,
        points: pointsRecord.points,
        ipAddress,
      });

      logger.info(`Awarded ${pointsRecord.points} points to driver ${driverId} for ${action}`);
      return pointsRecord;
    } catch (error) {
      throw handleServiceError('awardGamificationPoints', error, events.ERROR_CODES.EVENT_PROCESSING_FAILED);
    }
  }

  static async updateDriverLocation(driverId, locationInput, sessionToken, ipAddress) {
    try {
      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        throw new AppError(
          formatMessage('driver', 'notifications', events.SETTINGS.DEFAULT_LANGUAGE, 'driverManagement.errors.driverNotFound'),
          404,
          events.ERROR_CODES.DRIVER_NOT_FOUND
        );
      }

      const resolvedLocation = await locationService.resolveLocation(locationInput, driver.user_id, sessionToken);

      await driver.update({
        last_known_location: resolvedLocation.coordinates,
        updated_at: new Date(),
      });

      await auditService.logAction({
        userId: driver.user_id,
        role: 'driver',
        action: events.AUDIT_TYPES.DRIVER_LOCATION_UPDATED,
        details: { location: resolvedLocation },
        ipAddress,
      });

      socketService.emit(null, events.EVENT_TYPES.DRIVER_LOCATION_UPDATED, {
        userId: driver.user_id,
        driverId,
        location: resolvedLocation,
      });

      emitter.emit(events.EVENT_TYPES.DRIVER_LOCATION_UPDATED, {
        driverId,
        location: resolvedLocation,
        ipAddress,
      });

      logger.info(`Location updated for driver ${driverId}`);
      return resolvedLocation;
    } catch (error) {
      throw handleServiceError('updateDriverLocation', error, events.ERROR_CODES.EVENT_PROCESSING_FAILED);
    }
  }
}

module.exports = DriverManagementService;