'use strict';

const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const config = require('@config/config');
const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});

module.exports = {
  /**
   * Retrieve place details from Google Maps.
   * @param {string} placeId
   * @param {string} [sessionToken]
   * @returns {object}
   */
  async getPlaceDetails(placeId, sessionToken) {
    try {
      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          sessiontoken: sessionToken,
          key: config.googleMaps.apiKey,
        },
      });

      const { result } = response.data;
      logger.logApiEvent('Place details retrieved', { placeId });
      return {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        components: result.address_components,
        countryCode: result.address_components.find((c) => c.types.includes('country'))?.short_name,
      };
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve place details', { error: error.message, placeId });
      throw new AppError('Failed to retrieve place details', 500, 'PLACE_DETAILS_FAILED');
    }
  },

  /**
   * Get address predictions from Google Maps.
   * @param {string} input
   * @param {string} [sessionToken]
   * @returns {array}
   */
  async getAddressPredictions(input, sessionToken) {
    try {
      const response = await client.autocomplete({
        params: {
          input,
          sessiontoken: sessionToken,
          key: config.googleMaps.apiKey,
        },
      });

      logger.logApiEvent('Address predictions retrieved', { input });
      return response.data.predictions.map((p) => ({
        placeId: p.place_id,
        description: p.description,
        structuredFormatting: p.structured_formatting,
      }));
    } catch (error) {
      logger.logErrorEvent('Failed to retrieve address predictions', { error: error.message, input });
      throw new AppError('Failed to retrieve address predictions', 500, 'ADDRESS_PREDICTIONS_FAILED');
    }
  },

  /**
   * Resolve location data into a geo-point and formatted address.
   * @param {object} locationData
   * @param {string} [sessionToken]
   * @returns {object}
   */
  async resolveLocation(locationData, sessionToken) {
    try {
      const { placeId, address, coordinates } = locationData;
      let resolvedLocation;

      if (placeId) {
        resolvedLocation = await this.getPlaceDetails(placeId, sessionToken);
      } else if (address) {
        const response = await client.geocode({
          params: {
            address,
            key: config.googleMaps.apiKey,
          },
        });
        const result = response.data.results[0];
        resolvedLocation = {
          placeId: result.place_id,
          formattedAddress: result.formatted_address,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          components: result.address_components,
          countryCode: result.address_components.find((c) => c.types.includes('country'))?.short_name,
        };
      } else if (coordinates) {
        const response = await client.reverseGeocode({
          params: {
            latlng: [coordinates.latitude, coordinates.longitude],
            key: config.googleMaps.apiKey,
          },
        });
        const result = response.data.results[0];
        resolvedLocation = {
          placeId: result.place_id,
          formattedAddress: result.formatted_address,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          components: result.address_components,
          countryCode: result.address_components.find((c) => c.types.includes('country'))?.short_name,
        };
      } else {
        throw new AppError('Invalid location data', 400, 'INVALID_LOCATION');
      }

      // Validate address components
      if (!resolvedLocation.countryCode) {
        throw new AppError('Country code not found in address', 400, 'INVALID_COUNTRY_CODE');
      }
      // Example: Restrict to supported countries (modify as needed)
      const supportedCountries = config.supportedCountries || ['US', 'CA', 'GB'];
      if (!supportedCountries.includes(resolvedLocation.countryCode)) {
        throw new AppError('Country not supported', 400, 'UNSUPPORTED_COUNTRY');
      }

      logger.logApiEvent('Location resolved', { placeId, address });
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
      const supportedCountries = config.supportedCountries || ['US', 'CA', 'GB'];
      const isValid = supportedCountries.includes(countryCode);
      logger.info('Address validation', { countryCode, isValid });
      return isValid;
    } catch (error) {
      logger.logErrorEvent('Failed to validate address', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to validate address', 400, 'ADDRESS_VALIDATION_FAILED');
    }
  },
};