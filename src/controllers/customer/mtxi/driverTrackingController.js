'use strict';

const driverService = require('@services/driverService');
const auditService = require('@services/common/auditService');
const socketService = require('@services/common/socketService');
const locationService = require('@services/common/locationService');
const driverConstants = require('@constants/driver/driverConstants');
const customerGamificationConstants = require('@constants/customer/customerGamificationConstants');
const localizationConstants = require('@constants/common/localizationConstants');
const { formatMessage } = require('@utils/localization');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { sequelize } = require('@models');

module.exports = {
  async trackDriver(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { rideId } = req.params;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const driverData = await driverService.trackDriver(rideId, transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'DRIVER_TRACKED'),
        details: { rideId, driverId: driverData.driverId },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'DRIVER_TRACKED', {
        userId,
        role: 'customer',
        auditAction: 'DRIVER_TRACKED',
        details: { rideId, driverId: driverData.driverId },
      }, `customer:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, 'success.driver_tracked'),
        data: driverData,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Track driver failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async updateDriverLocation(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role, io } = req;
      const { coordinates, countryCode } = req.body;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'driver') {
        throw new AppError(
          formatMessage('driver', 'location', languageCode, 'error.unauthorized'),
          403,
          driverConstants.ERROR_CODES[2]
        );
      }

      const resolvedLocation = await locationService.resolveLocation(coordinates, userId, req.sessionToken, 'driver', languageCode);
      await driverService.updateDriverLocation(userId, resolvedLocation.coordinates, transaction);

      await auditService.logAction({
        userId,
        role: 'driver',
        action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'LOCATION_UPDATED'),
        details: { coordinates: resolvedLocation.coordinates },
        ipAddress: req.ip,
      });

      await socketService.emit(io, 'LOCATION_UPDATED', {
        userId,
        role: 'driver',
        auditAction: 'LOCATION_UPDATED',
        details: { coordinates: resolvedLocation.coordinates },
      }, `driver:${userId}`, languageCode);

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('driver', 'location', languageCode, 'success.location_updated'),
        data: resolvedLocation,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Update driver location failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },

  async getNearbyDrivers(req, res, next) {
    const transaction = await sequelize.transaction();
    try {
      const { userId, role } = req;
      const languageCode = req.languageCode || localizationConstants.DEFAULT_LANGUAGE;

      if (role !== 'customer') {
        throw new AppError(
          formatMessage('customer', 'ride', languageCode, 'error.unauthorized'),
          403,
          customerGamificationConstants.ERROR_CODES[2]
        );
      }

      const drivers = await driverService.getNearbyDrivers(transaction);

      await auditService.logAction({
        userId,
        role: 'customer',
        action: driverConstants.COMPLIANCE_CONSTANTS.AUDIT_TYPES.find(a => a === 'NEARBY_DRIVERS_VIEWED'),
        details: { count: drivers.length },
        ipAddress: req.ip,
      });

      await transaction.commit();
      res.status(200).json({
        success: true,
        message: formatMessage('customer', 'ride', languageCode, 'success.nearby_drivers_retrieved'),
        data: drivers,
      });
    } catch (error) {
      await transaction.rollback();
      logger.logErrorEvent('Get nearby drivers failed', { error: error.message, userId: req.userId });
      next(error);
    }
  },
};