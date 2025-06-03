'use strict';

/**
 * Location Service
 * Centralized service for resolving, validating, and managing locations across all roles.
 * Integrates with Google Maps/OpenStreetMap via localizationServiceConstants, validates
 * against locationConstants, supports geofence checks, and updates sessions/addresses.
 *
 * Last Updated: May 28, 2025
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const NodeCache = require('node-cache');
const config = require('@config/config');
const locationConstants = require('@constants/common/locationConstants');
const localizationServiceConstants = require('@constants/common/localizationServiceConstants');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Address, Geofence, User, Session, Customer, Driver, Merchant, Staff } = require('@models');
const { Op } = require('sequelize');

// Initialize cache
const locationCache = new NodeCache({ stdTTL: locationConstants.LOCATION_CONSTANTS.CACHE_TTL_SECONDS });

// Configure axios retries
axiosRetry(axios, {
  retries: locationConstants.LOCATION_CONSTANTS.API_RETRY_ATTEMPTS,
  retryDelay: (retryCount) => retryCount * locationConstants.LOCATION_CONSTANTS.API_RETRY_DELAY_MS,
});

class LocationService {
  /**
   * Resolves and validates a location input for any role.
   * @param {Object|string} location - Location input (address string, { lat, lng }, or JSON).
   * @param {number} [userId] - User ID for address storage and session updates.
   * @param {string} [sessionToken] - Session token for active session updates.
   * @param {string} role - User role (admin, customer, driver, staff, merchant).
   * @param {string} [languageCode] - Preferred language for error messages.
   * @returns {Promise<Object>} Standardized location object.
   */
  async resolveLocation(location, userId, sessionToken, role, languageCode = localizationServiceConstants.LANGUAGE_CONSTANTS.DEFAULT_LANGUAGE) {
    if (!role || !locationConstants.LOCATION_CONSTANTS.ROLES[role.toUpperCase()]) {
      throw new AppError('Invalid role', 400, locationConstants.LOCATION_CONSTANTS.ROLES.ADMIN.ERROR_CODES.INVALID_LOCATION);
    }
    if (!localizationServiceConstants.LANGUAGE_CONSTANTS.SUPPORTED_LANGUAGES.includes(languageCode)) {
      languageCode = localizationServiceConstants.LANGUAGE_CONSTANTS.DEFAULT_LANGUAGE;
    }
    const roleConfig = locationConstants.LOCATION_CONSTANTS.ROLES[role.toUpperCase()];

    try {
      let geocodedResult;
      const cacheKey = typeof location === 'string' ? location : `${location.lat}:${location.lng}`;

      // Check cache
      const cached = locationCache.get(cacheKey);
      if (cached) {
        logger.info('Location retrieved from cache', { cacheKey, userId, role });
        geocodedResult = cached;
      } else {
        // Determine map provider based on country
        const countryCode = await this.deriveCountryCode(location);
        const mapProvider = roleConfig.MAP_PROVIDER[countryCode] || localizationServiceConstants.MAP_INTEGRATION_CONSTANTS.DEFAULT_MAP_PROVIDER;

        if (typeof location === 'string') {
          geocodedResult = await this.geocodeAddress(location, mapProvider);
        } else if (location.lat && location.lng) {
          geocodedResult = await this.reverseGeocode(location.lat, location.lng, mapProvider);
        } else if (location.address || location.formattedAddress) {
          geocodedResult = await this.geocodeAddress(location.address || location.formattedAddress, mapProvider);
        } else {
          throw new AppError(
            'Invalid location format',
            400,
            roleConfig.ERROR_CODES.INVALID_LOCATION
          );
        }
        locationCache.set(cacheKey, geocodedResult);
      }

      const { formatted_address, geometry, address_components, place_id, types } = geocodedResult;

      // Extract country code and city
      const countryComponent = address_components.find(comp => comp.types.includes('country'));
      const cityComponent = address_components.find(comp =>
        comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')
      );
      const countryCode = countryComponent ? countryComponent.short_name : null;
      const city = cityComponent ? cityComponent.long_name : null;

      // Validate supported cities
      if (!countryCode || !roleConfig.SUPPORTED_CITIES[countryCode]?.includes(city)) {
        throw new AppError(
          `Unsupported city: ${city || 'unknown'}`,
          400,
          roleConfig.ERROR_CODES.UNSUPPORTED_CITY
        );
      }

      // Create standardized location object
      const resolvedLocation = {
        formattedAddress: formatted_address,
        placeId: place_id,
        coordinates: {
          lat: geometry.location.lat,
          lng: geometry.location.lng,
        },
        countryCode,
        city,
        components: address_components,
        locationType: geometry.location_type || types[0],
        confidenceLevel: this.determineConfidenceLevel(geometry.location_type || types[0]),
      };

      // Validate confidence level
      if (!this.isConfidenceLevelSufficient(resolvedLocation.confidenceLevel, roleConfig.MIN_CONFIDENCE_LEVEL)) {
        throw new AppError(
          `Insufficient location accuracy: ${resolvedLocation.confidenceLevel}`,
          400,
          roleConfig.ERROR_CODES.INVALID_LOCATION
        );
      }

      // Role-specific validations
      if (userId) {
        const user = await User.findByPk(userId);
        if (!user) {
          throw new AppError('User not found', 404, roleConfig.ERROR_CODES.INVALID_LOCATION);
        }
        await this.validateRoleSpecificConstraints(userId, role, resolvedLocation);
        await this.storeAddress(resolvedLocation, userId, role);
      }

      // Update session
      if (sessionToken && userId) {
        await this.updateSessionLocation(userId, sessionToken, resolvedLocation, role);
      }

      // Geofence validation
      if (roleConfig.GEOFENCE_REQUIRED) {
        await this.validateGeofence(resolvedLocation, role, userId);
      }

      logger.info('Location resolved', { placeId: resolvedLocation.placeId, userId, role });
      return resolvedLocation;
    } catch (error) {
      logger.error('Location resolution failed', { error: error.message, location, userId, role });
      throw error instanceof AppError ? error : new AppError(
        'Location resolution failed',
        500,
        roleConfig.ERROR_CODES.API_FAILURE
      );
    }
  }

  /**
   * Derives country code from location input.
   * @param {Object|string} location - Location input.
   * @returns {Promise<string>} Country code.
   */
  async deriveCountryCode(location) {
    try {
      if (typeof location === 'string') {
        const result = await this.geocodeAddress(location);
        return result.address_components.find(comp => comp.types.includes('country'))?.short_name || 'US';
      } else if (location.lat && location.lng) {
        const result = await this.reverseGeocode(location.lat, location.lng);
        return result.address_components.find(comp => comp.types.includes('country'))?.short_name || 'US';
      } else if (location.address || location.formattedAddress) {
        const result = await this.geocodeAddress(location.address || location.formattedAddress);
        return result.address_components.find(comp => comp.types.includes('country'))?.short_name || 'US';
      }
      return 'US';
    } catch (error) {
      logger.warn('Country code derivation failed, defaulting to US', { error: error.message });
      return 'US';
    }
  }

  /**
   * Updates session location.
   * @param {number} userId - User ID.
   * @param {string} sessionToken - Session token.
   * @param {Object} location - Resolved location.
   * @param {string} role - User role.
   * @returns {Promise<void>}
   */
  async updateSessionLocation(userId, sessionToken, location, role) {
    const roleConfig = locationConstants.LOCATION_CONSTANTS.ROLES[role.toUpperCase()];
    try {
      const session = await Session.findOne({
        where: {
          user_id: userId,
          token: sessionToken,
          status: 'ACTIVE',
          expires_at: { [Op.gt]: new Date() },
        },
      });

      if (!session) {
        logger.warn('No active session found', { userId, sessionToken, role });
        return;
      }

      await session.update({
        location: {
          formattedAddress: location.formattedAddress,
          coordinates: location.coordinates,
          countryCode: location.countryCode,
          city: location.city,
        },
        last_active_at: new Date(),
        updated_at: new Date(),
      });

      logger.info('Session location updated', { sessionId: session.id, userId, role });
    } catch (error) {
      logger.error('Session location update failed', { error: error.message, userId, sessionToken, role });
      throw new AppError('Session update failed', 500, roleConfig.ERROR_CODES.SESSION_UPDATE_FAILED);
    }
  }

  /**
   * Geocodes an address string.
   * @param {string} address - Address string.
   * @param {string} provider - Map provider (google_maps, openstreetmap).
   * @returns {Promise<Object>} Geocoded result.
   */
  async geocodeAddress(address, provider = localizationServiceConstants.MAP_INTEGRATION_CONSTANTS.DEFAULT_MAP_PROVIDER) {
    try {
      if (provider === 'openstreetmap') {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: address,
            format: 'json',
            addressdetails: 1,
            limit: 1,
          },
          headers: { 'User-Agent': 'MM1.0-App' },
        });

        if (!response.data.length) {
          throw new Error('No results found');
        }

        const result = response.data[0];
        return {
          formatted_address: result.display_name,
          geometry: { location: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) } },
          address_components: this.parseOSMAddressComponents(result.address),
          place_id: result.place_id,
          types: [result.type],
        };
      } else {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            address,
            key: config.googleMaps.apiKey,
          },
        });

        if (response.data.status !== 'OK' || !response.data.results.length) {
          throw new Error('Geocoding failed');
        }

        return response.data.results[0];
      }
    } catch (error) {
      logger.error('Geocoding failed', { address, provider, error: error.message });
      throw new AppError('Geocoding failed', 400, locationConstants.LOCATION_CONSTANTS.ROLES.ADMIN.ERROR_CODES.API_FAILURE);
    }
  }

  /**
   * Reverse geocodes coordinates.
   * @param {number} lat - Latitude.
   * @param {number} lng - Longitude.
   * @param {string} provider - Map provider.
   * @returns {Promise<Object>} Geocoded result.
   */
  async reverseGeocode(lat, lng, provider = localizationServiceConstants.MAP_INTEGRATION_CONSTANTS.DEFAULT_MAP_PROVIDER) {
    try {
      if (provider === 'openstreetmap') {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            lat,
            lon: lng,
            format: 'json',
            addressdetails: 1,
          },
          headers: { 'User-Agent': 'MM1.0-App' },
        });

        if (!response.data.address) {
          throw new Error('No results found');
        }

        return {
          formatted_address: response.data.display_name,
          geometry: { location: { lat: parseFloat(response.data.lat), lng: parseFloat(response.data.lon) } },
          address_components: this.parseOSMAddressComponents(response.data.address),
          place_id: response.data.place_id,
          types: [response.data.type],
        };
      } else {
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
          params: {
            latlng: `${lat},${lng}`,
            key: config.googleMaps.apiKey,
          },
        });

        if (response.data.status !== 'OK' || !response.data.results.length) {
          throw new Error('Reverse geocoding failed');
        }

        return response.data.results[0];
      }
    } catch (error) {
      logger.error('Reverse geocoding failed', { lat, lng, provider, error: error.message });
      throw new AppError('Reverse geocoding failed', 400, locationConstants.LOCATION_CONSTANTS.ROLES.ADMIN.ERROR_CODES.API_FAILURE);
    }
  }

  /**
   * Parses OSM address components.
   * @param {Object} address - OSM address object.
   * @returns {Array} Standardized components.
   */
  parseOSMAddressComponents(address) {
    const components = [];
    for (const [type, value] of Object.entries(address)) {
      components.push({
        long_name: value,
        short_name: value,
        types: [type],
      });
    }
    return components;
  }

  /**
   * Stores resolved location in Address model.
   * @param {Object} location - Resolved location.
   * @param {number} userId - User ID.
   * @param {string} role - User role.
   * @returns {Promise<void>}
   */
  async storeAddress(location, userId, role) {
    const roleConfig = locationConstants.LOCATION_CONSTANTS.ROLES[role.toUpperCase()];
    try {
      const addressCount = await Address.count({ where: { user_id: userId } });
      if (addressCount >= roleConfig.MAX_ADDRESS_STORAGE) {
        const oldestAddress = await Address.findOne({
          where: { user_id: userId },
          order: [['createdAt', 'ASC']],
        });
        if (oldestAddress) await oldestAddress.destroy();
      }

      await Address.create({
        user_id: userId,
        formattedAddress: location.formattedAddress,
        placeId: location.placeId,
        latitude: location.coordinates.lat,
        longitude: location.coordinates.lng,
        components: location.components,
        countryCode: location.countryCode,
        locationType: location.locationType,
        confidenceLevel: location.confidenceLevel,
        validationStatus: location.confidenceLevel === 'HIGH' ? 'VALID' : 'PENDING',
        validatedAt: new Date(),
      });

      if (role === 'customer') {
        await Customer.update(
          { last_known_location: { lat: location.coordinates.lat, lng: location.coordinates.lng } },
          { where: { user_id: userId } }
        );
      } else if (role === 'driver') {
        await Driver.update(
          { current_location: { lat: location.coordinates.lat, lng: location.coordinates.lng }, last_location_update: new Date() },
          { where: { user_id: userId } }
        );
      }
    } catch (error) {
      logger.error('Address storage failed', { userId, role, error: error.message });
    }
  }

  /**
   * Validates location against geofences.
   * @param {Object} location - Resolved location.
   * @param {string} role - User role.
   * @param {number} [userId] - User ID for role-specific geofences.
   * @returns {Promise<void>}
   */
  async validateGeofence(location, role, userId) {
    const roleConfig = locationConstants.LOCATION_CONSTANTS.ROLES[role.toUpperCase()];
    try {
      let geofences = await Geofence.findAll({ where: { active: true } });

      if (role === 'merchant' && userId) {
        const merchant = await Merchant.findOne({ where: { user_id: userId } });
        if (merchant && merchant.geofence_id) {
          const merchantGeofence = await Geofence.findByPk(merchant.geofence_id);
          if (merchantGeofence) geofences = [merchantGeofence];
        }
      } else if (role === 'staff' && userId) {
        const staff = await Staff.findOne({ where: { user_id: userId } });
        if (staff && staff.geofence_id) {
          const staffGeofence = await Geofence.findByPk(staff.geofence_id);
          if (staffGeofence) geofences = [staffGeofence];
        }
      }

      const isWithinGeofence = geofences.some(geofence =>
        this.isPointInPolygon(
          [location.coordinates.lng, location.coordinates.lat],
          geofence.coordinates
        )
      );

      if (!isWithinGeofence) {
        logger.warn('Location outside geofences', { placeId: location.placeId, role, userId });
        throw new AppError('Location outside allowed area', 400, roleConfig.ERROR_CODES.GEOFENCE_VIOLATION);
      }
    } catch (error) {
      logger.error('Geofence validation failed', { role, userId, error: error.message });
      throw error instanceof AppError ? error : new AppError(
        'Geofence validation failed',
        500,
        roleConfig.ERROR_CODES.GEOFENCE_VIOLATION
      );
    }
  }

  /**
   * Validates role-specific constraints.
   * @param {number} userId - User ID.
   * @param {string} role - User role.
   * @param {Object} location - Resolved location.
   * @returns {Promise<void>}
   */
  async validateRoleSpecificConstraints(userId, role, location) {
    const roleConfig = locationConstants.LOCATION_CONSTANTS.ROLES[role.toUpperCase()];
    try {
      if (role === 'driver') {
        const driver = await Driver.findOne({ where: { user_id: userId } });
        if (driver && driver.active_route_id) {
          const route = await sequelize.models.Route.findByPk(driver.active_route_id);
          if (route) {
            const points = [
              [route.origin.lng, route.origin.lat],
              ...(route.waypoints ? route.waypoints.map(wp => [wp.lng, wp.lat]) : []),
              [route.destination.lng, route.destination.lat],
            ];
            if (points.length > 1) points.push(points[0]);
            if (points.length >= 3 && !this.isPointInPolygon(
              [location.coordinates.lng, location.coordinates.lat],
              points
            )) {
              throw new AppError('Location outside active route', 400, roleConfig.ERROR_CODES.GEOFENCE_VIOLATION);
            }
          } else if (driver.service_area) {
            if (!this.isPointInPolygon(
              [location.coordinates.lng, location.coordinates.lat],
              driver.service_area.coordinates
            )) {
              throw new AppError('Location outside service area', 400, roleConfig.ERROR_CODES.GEOFENCE_VIOLATION);
            }
          }
        }
      } else if (role === 'merchant') {
        const merchant = await Merchant.findOne({ where: { user_id: userId } });
        if (merchant && merchant.service_radius && merchant.location) {
          const distance = this.calculateDistance(
            location.coordinates,
            { lat: merchant.location.coordinates[1], lng: merchant.location.coordinates[0] }
          );
          if (distance > merchant.service_radius) {
            throw new AppError('Location outside service radius', 400, roleConfig.ERROR_CODES.GEOFENCE_VIOLATION);
          }
        }
      }
    } catch (error) {
      logger.error('Role-specific validation failed', { role, userId, error: error.message });
      throw error;
    }
  }

  /**
   * Determines confidence level.
   * @param {string} locationType - Google Maps/OSM location type.
   * @returns {string} Confidence level.
   */
  determineConfidenceLevel(locationType) {
    const levels = locationConstants.LOCATION_CONSTANTS.SUPPORTED_CONFIDENCE_LEVELS;
    switch (locationType) {
      case 'ROOFTOP':
      case 'point':
        return levels[0]; // HIGH
      case 'RANGE_INTERPOLATED':
      case 'GEOMETRIC_CENTER':
      case 'road':
        return levels[1]; // MEDIUM
      default:
        return levels[2]; // LOW
    }
  }

  /**
   * Checks if confidence level meets minimum requirement.
   * @param {string} level - Confidence level.
   * @param {string} minLevel - Minimum required level.
   * @returns {boolean} True if sufficient.
   */
  isConfidenceLevelSufficient(level, minLevel) {
    const levels = locationConstants.LOCATION_CONSTANTS.SUPPORTED_CONFIDENCE_LEVELS;
    return levels.indexOf(level) <= levels.indexOf(minLevel);
  }

  /**
   * Checks if point is inside polygon.
   * @param {Array<number>} point - [lng, lat].
   * @param {Array<Array<number>>} polygon - Array of [lng, lat].
   * @returns {boolean} True if inside.
   */
  isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0], yi = polygon[i][1];
      const xj = polygon[j][0], yj = polygon[j][1];
      const intersect = ((yi > point[1]) !== (yj > point[1])) &&
        (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Calculates distance between two coordinates (Haversine formula).
   * @param {Object} coord1 - { lat, lng }.
   * @param {Object} coord2 - { lat, lng }.
   * @returns {number} Distance in kilometers.
   */
  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return Infinity;
    const toRad = (deg) => deg * Math.PI / 180;
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coord2.lat - coord1.lat);
    const dLng = toRad(coord2.lng - coord1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(coord1.lat)) * Math.cos(toRad(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = new LocationService();