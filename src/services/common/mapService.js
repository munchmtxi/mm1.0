'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const config = require('@config/config');
const { Client } = require('@googlemaps/google-maps-services-js');
const axios = require('axios');
const { sequelize } = require('@models'); // Adjust path to your Sequelize models
const socketService = require('@services/socketService'); // Adjust path to socketService.js
const localizationConstants = require('@constants/common/localizationConstants');

const googleMapsClient = new Client({});

module.exports = {
  /**
   * Retrieve place details from Google Maps or OpenStreetMap.
   * @param {string} placeId
   * @param {string} countryCode
   * @param {string} [sessionToken]
   * @returns {object}
   */
  async getPlaceDetails(placeId, countryCode, sessionToken) {
    try {
      const mapProvider = localizationConstants.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';
      let result;

      if (mapProvider === 'openstreetmap') {
        const response = await axios.get(`https://nominatim.openstreetmap.org/details`, {
          params: { place_id: placeId, format: 'json' },
          headers: { 'User-Agent': config.nominatim.userAgent },
        });
        result = response.data;
      } else {
        const { data: { result } } = await googleMapsClient.placeDetails({
          params: { place_id: placeId, sessiontoken: sessionToken, key: config.googleMaps.apiKey },
        });
        result = result;
      }

      const location = formatLocationResponse(result, mapProvider);
      logger.logApiEvent('Place details retrieved', { placeId, countryCode, mapProvider });
      return location;
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve place details', { error: error.message, placeId, countryCode });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve place details', 500, 'PLACE_DETAILS_FAILED');
    }
  },

  /**
   * Get address predictions from Google Maps or OpenStreetMap.
   * @param {string} input
   * @param {string} countryCode
   * @param {string} [sessionToken]
   * @returns {array}
   */
  async getAddressPredictions(input, countryCode, sessionToken) {
    try {
      const mapProvider = localizationConstants.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';
      let predictions;

      if (mapProvider === 'openstreetmap') {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
          params: { q: input, format: 'json', limit: 5, countrycodes: countryCode.toLowerCase() },
          headers: { 'User-Agent': config.nominatim.userAgent },
        });
        predictions = response.data.map(p => ({
          placeId: p.place_id,
          description: p.display_name,
          structuredFormatting: {
            main_text: p.display_name.split(',')[0],
            secondary_text: p.display_name.split(',').slice(1).join(','),
          },
        }));
      } else {
        const { data: { predictions } } = await googleMapsClient.autocomplete({
          params: { input, sessiontoken: sessionToken, key: config.googleMaps.apiKey },
        });
        predictions = predictions.map(p => ({
          placeId: p.place_id,
          description: p.description,
          structuredFormatting: p.structured_formatting,
        }));
      }

      logger.logApiEvent('Address predictions retrieved', { input, countryCode, mapProvider });
      return predictions;
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve address predictions', { error: error.message, input, countryCode });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve address predictions', 500, 'ADDRESS_PREDICTIONS_FAILED');
    }
  },

  /**
   * Retrieve driver, merchant, staff, or customer location using their ID.
   * @param {string} entityId
   * @param {string} entityType
   * @param {string} countryCode
   * @param {string} requesterId
   * @param {string} requesterRole
   * @param {string} [sessionToken]
   * @returns {object}
   */
  async getEntityLocation(entityId, entityType, countryCode, requesterId, requesterRole, sessionToken) {
    try {
      if (!['driver', 'merchant', 'staff', 'customer'].includes(entityType)) {
        throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE');
      }
      if (!localizationConstants.SUPPORTED_COUNTRIES.includes(countryCode)) {
        throw new AppError('Unsupported country', 400, 'UNSUPPORTED_COUNTRY');
      }

      if (entityType === 'customer') {
        await validateCustomerLocationAccess(entityId, requesterId, requesterRole);
      }

      const locationData = await fetchEntityLocation(entityId, entityType);
      if (!locationData) {
        throw new AppError(`${entityType} location not found`, 404, `${entityType.toUpperCase()}_LOCATION_NOT_FOUND`);
      }

      const resolvedLocation = await this.resolveLocation(locationData, countryCode, sessionToken);
      logger.logApiEvent(`${entityType} location retrieved`, { entityId, entityType, requesterId, requesterRole, countryCode });
      return resolvedLocation;
    } catch (error) {
      logger.logErrorEvent(`Failed to retrieve ${entityType} location`, { error: error.message, entityId, requesterId });
      throw error instanceof AppError ? error : new AppError(`Failed to retrieve ${entityType} location`, 500, `${entityType.toUpperCase()}_LOCATION_FAILED`);
    }
  },

  /**
   * Resolve location data into a geo-point and formatted address.
   * @param {object} locationData
   * @param {string} countryCode
   * @param {string} [sessionToken]
   * @returns {object}
   */
  async resolveLocation(locationData, countryCode, sessionToken) {
    try {
      const { placeId, address, coordinates } = locationData;
      let resolvedLocation;
      const mapProvider = localizationConstants.SUPPORTED_MAP_PROVIDERS[countryCode] || 'google_maps';

      if (placeId) {
        resolvedLocation = await this.getPlaceDetails(placeId, countryCode, sessionToken);
      } else if (address) {
        if (mapProvider === 'openstreetmap') {
          const { data } = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: { q: address, format: 'json', limit: 1, countrycodes: countryCode.toLowerCase() },
            headers: { 'User-Agent': config.nominatim.userAgent },
          });
          resolvedLocation = formatLocationResponse(data[0], mapProvider);
        } else {
          const { data: { results } } = await googleMapsClient.geocode({
            params: { address, key: config.googleMaps.apiKey },
          });
          resolvedLocation = formatLocationResponse(results[0], mapProvider);
        }
      } else if (coordinates) {
        if (mapProvider === 'openstreetmap') {
          const { data } = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: { lat: coordinates.latitude, lon: coordinates.longitude, format: 'json' },
            headers: { 'User-Agent': config.nominatim.userAgent },
          });
          resolvedLocation = formatLocationResponse(data, mapProvider);
        } else {
          const { data: { results } } = await googleMapsClient.reverseGeocode({
            params: { latlng: [coordinates.latitude, coordinates.longitude], key: config.googleMaps.apiKey },
          });
          resolvedLocation = formatLocationResponse(results[0], mapProvider);
        }
      } else {
        throw new AppError('Invalid location data', 400, 'INVALID_LOCATION');
      }

      validateCountry(resolvedLocation);
      logger.logApiEvent('Location resolved', { placeId, address, countryCode, mapProvider });
      return resolvedLocation;
    } catch (error) {
      logger.logErrorEvent('Failed to resolve location', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to resolve location', 500, 'LOCATION_RESOLUTION_FAILED');
    }
  },

  /**
   * Validate address components against supported regions.
   * @param {object} addressData
   * @returns {boolean}
   */
  async validateAddress(addressData) {
    try {
      const { countryCode } = addressData;
      if (!countryCode) {
        throw new AppError('Country code is required', 400, 'MISSING_COUNTRY_CODE');
      }
      const isValid = localizationConstants.SUPPORTED_COUNTRIES.includes(countryCode);
      logger.info('Address validation', { countryCode, isValid });
      return isValid;
    } catch (error) {
      logger.logErrorEvent('Failed to validate address', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to validate address', 400, 'ADDRESS_VALIDATION_FAILED');
    }
  },

  /**
   * Update entity location and broadcast to authorized clients.
   * @param {Object} io - Socket.IO instance
   * @param {string} entityId
   * @param {string} entityType
   * @param {object} coordinates - { latitude, longitude }
   * @param {string} countryCode
   * @returns {object}
   */
  async updateEntityLocation(io, entityId, entityType, coordinates, countryCode) {
    try {
      if (!['driver', 'merchant', 'staff', 'customer'].includes(entityType)) {
        throw new AppError('Invalid entity type', 400, 'INVALID_ENTITY_TYPE');
      }
      if (!localizationConstants.SUPPORTED_COUNTRIES.includes(countryCode)) {
        throw new AppError('Unsupported country', 400, 'UNSUPPORTED_COUNTRY');
      }

      const Model = {
        driver: sequelize.models.Driver,
        merchant: sequelize.models.Merchant,
        staff: sequelize.models.Staff,
        customer: sequelize.models.Customer,
      }[entityType];

      const entity = await Model.findByPk(entityId);
      if (!entity) {
        throw new AppError(`${entityType} not found`, 404, `${entityType.toUpperCase()}_NOT_FOUND`);
      }

      if (!isValidCoordinates(coordinates)) {
        throw new AppError('Invalid coordinates', 400, 'INVALID_COORDINATES');
      }

      const locationData = { coordinates };
      const resolvedLocation = await this.resolveLocation(locationData, countryCode);
      
      await entity.update({
        [entityType === 'merchant' || entityType === 'staff' ? 'location' : 
         entityType === 'driver' ? 'current_location' : 'last_known_location']: {
          type: 'Point',
          coordinates: [resolvedLocation.longitude, resolvedLocation.latitude],
        },
        last_location_update: new Date(),
      });

      const rooms = await getAuthorizedRooms(entityId, entityType);
      for (const room of rooms) {
        await socketService.emit(io, 'LOCATION_UPDATE', {
          userId: entityId,
          role: entityType,
          auditAction: 'LOCATION_UPDATED',
          details: { coordinates: resolvedLocation },
          location: resolvedLocation,
        }, room);
      }

      logger.logApiEvent(`${entityType} location updated`, { entityId, coordinates, countryCode });
      return resolvedLocation;
    } catch (error) {
      logger.logErrorEvent(`Failed to update ${entityType} location`, { error: error.message, entityId });
      throw error instanceof AppError ? error : new AppError(`Failed to update ${entityType} location`, 500, `${entityType.toUpperCase()}_LOCATION_UPDATE_FAILED`);
    }
  },
};

/**
 * Format API response into a consistent location object.
 * @param {object} result
 * @param {string} mapProvider
 * @returns {object}
 */
function formatLocationResponse(result, mapProvider) {
  if (mapProvider === 'openstreetmap') {
    return {
      placeId: result.place_id,
      formattedAddress: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      components: result.address ? Object.entries(result.address).map(([type, name]) => ({ types: [type], long_name: name, short_name: name })) : [],
      countryCode: result.address?.country_code?.toUpperCase(),
    };
  }
  return {
    placeId: result.place_id,
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lngkrieg
    components: result.address_components,
    countryCode: result.address_components?.find(c => c.types.includes('country'))?.short_name,
  };
}

/**
 * Validate country code against supported countries.
 * @param {object} location
 */
function validateCountry(location) {
  if (!location.countryCode) {
    throw new AppError('Country code not found in address', 400, 'INVALID_COUNTRY_CODE');
  }
  if (!localizationConstants.SUPPORTED_COUNTRIES.includes(location.countryCode)) {
    throw new AppError('Country not supported', 400, 'UNSUPPORTED_COUNTRY');
  }
}

/**
 * Fetch entity location from database.
 * @param {string} entityId
 * @param {string} entityType
 * @returns {object}
 */
async function fetchEntityLocation(entityId, entityType) {
  const Model = {
    driver: sequelize.models.Driver,
    merchant: sequelize.models.Merchant,
    staff: sequelize.models.Staff,
    customer: sequelize.models.Customer,
  }[entityType];

  const entity = await Model.findByPk(entityId);
  if (!entity) {
    throw new AppError(`${entityType} not found`, 404, `${entityType.toUpperCase()}_NOT_FOUND`);
  }

  const locationField = entityType === 'merchant' || entityType === 'staff' ? 'location' : 
                       entityType === 'driver' ? 'current_location' : 'last_known_location';
  const location = entity[locationField];

  if (!location?.coordinates) {
    return null;
  }

  return {
    coordinates: {
      latitude: location.coordinates[1],
      longitude: location.coordinates[0],
    },
  };
}

/**
 * Validate customer location access based on requester role.
 * @param {string} customerId
 * @param {string} requesterId
 * @param {string} requesterRole
 */
async function validateCustomerLocationAccess(customerId, requesterId, requesterRole) {
  if (requesterRole === 'admin') {
    return;
  }

  if (['driver', 'merchant'].includes(requesterRole)) {
    const activeOrder = await sequelize.models.Order.findOne({
      where: {
        customer_id: customerId,
        [sequelize.Op.or]: [
          { driver_id: requesterRole === 'driver' ? requesterId : null },
          { merchant_id: requesterRole === 'merchant' ? requesterId : null },
        ],
        status: ['pending', 'accepted', 'in_progress'],
      },
    });

    if (!activeOrder) {
      throw new AppError('Unauthorized access to customer location', 403, 'UNAUTHORIZED_LOCATION_ACCESS');
    }
  } else {
    throw new AppError('Only admins, drivers, or merchants with active orders can access customer location', 403, 'UNAUTHORIZED_LOCATION_ACCESS');
  }
}

/**
 * Get authorized rooms for broadcasting location updates.
 * @param {string} entityId
 * @param {string} entityType
 * @returns {string[]}
 */
async function getAuthorizedRooms(entityId, entityType) {
  const rooms = [`${entityType}:${entityId}`];

  if (entityType === 'customer') {
    const activeOrders = await sequelize.models.Order.findAll({
      where: {
        customer_id: entityId,
        status: ['pending', 'accepted', 'in_progress'],
      },
    });

    for (const order of activeOrders) {
      if (order.driver_id) rooms.push(`driver:${order.driver_id}`);
      if (order.merchant_id) rooms.push(`merchant:${order.merchant_id}`);
    }
    rooms.push('admin');
  } else {
    rooms.push('admin');
  }

  return rooms;
}

/**
 * Validate coordinates.
 * @param {object} coordinates
 * @returns {boolean}
 */
function isValidCoordinates(coordinates) {
  return coordinates &&
         typeof coordinates.latitude === 'number' &&
         typeof coordinates.longitude === 'number' &&
         coordinates.latitude >= -90 && coordinates.latitude <= 90 &&
         coordinates.longitude >= -180 && coordinates.longitude <= 180;
}