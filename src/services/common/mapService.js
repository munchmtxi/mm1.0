'use strict';

const { Client } = require('@googlemaps/google-maps-services-js');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const config = require('@config/config');
const { SUPPORTED_COUNTRIES } = require('@constants/common/rideConstants');

const client = new Client({});

async function getPlaceDetails(placeId, sessionToken) {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        sessiontoken: sessionToken,
        key: config.googleMaps.apiKey,
      },
    });

    const { result } = response.data;
    const countryCode = result.address_components.find((c) => c.types.includes('country'))?.short_name;

    // Convert ISO 3166-1 alpha-2 to alpha-3 if necessary
    const countryCodeMap = {
      MW: 'MWI',
      TZ: 'TZA',
      MZ: 'MOZ',
      KE: 'KEN',
      ZM: 'ZMB',
      GH: 'GHA',
      SL: 'SLE',
      CA: 'CAN',
      AE: 'ARE'
    };
    const standardizedCountryCode = countryCodeMap[countryCode] || countryCode;

    if (!SUPPORTED_COUNTRIES.includes(standardizedCountryCode)) {
      throw new AppError(`Country ${standardizedCountryCode} not supported`, 400, 'UNSUPPORTED_COUNTRY');
    }

    logger.logApiEvent('Place details retrieved', { placeId });
    return {
      placeId: result.place_id,
      formattedAddress: result.formatted_address,
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      components: result.address_components,
      countryCode: standardizedCountryCode,
    };
  } catch (error) {
    logger.logErrorEvent('Failed to retrieve place details', { error: error.message, placeId });
    throw error instanceof AppError ? error : new AppError('Failed to retrieve place details', 500, 'PLACE_DETAILS_FAILED');
  }
}

async function getAddressPredictions(input, sessionToken) {
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
}

async function resolveLocation(locationData, sessionToken) {
  try {
    const { placeId, address, coordinates } = locationData;
    let resolvedLocation;

    if (placeId) {
      resolvedLocation = await getPlaceDetails(placeId, sessionToken);
    } else if (address) {
      const response = await client.geocode({
        params: {
          address,
          key: config.googleMaps.apiKey,
        },
      });
      const result = response.data.results[0];
      const countryCode = result.address_components.find((c) => c.types.includes('country'))?.short_name;
      const countryCodeMap = {
        MW: 'MWI',
        TZ: 'TZA',
        MZ: 'MOZ',
        KE: 'KEN',
        ZM: 'ZMB',
        GH: 'GHA',
        SL: 'SLE',
        CA: 'CAN',
        AE: 'ARE'
      };
      const standardizedCountryCode = countryCodeMap[countryCode] || countryCode;

      if (!SUPPORTED_COUNTRIES.includes(standardizedCountryCode)) {
        throw new AppError(`Country ${standardizedCountryCode} not supported`, 400, 'UNSUPPORTED_COUNTRY');
      }

      resolvedLocation = {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        components: result.address_components,
        countryCode: standardizedCountryCode,
      };
    } else if (coordinates) {
      const response = await client.reverseGeocode({
        params: {
          latlng: [coordinates.latitude, coordinates.longitude],
          key: config.googleMaps.apiKey,
        },
      });
      const result = response.data.results[0];
      const countryCode = result.address_components.find((c) => c.types.includes('country'))?.short_name;
      const countryCodeMap = {
        MW: 'MWI',
        TZ: 'TZA',
        MZ: 'MOZ',
        KE: 'KEN',
        ZM: 'ZMB',
        GH: 'GHA',
        SL: 'SLE',
        CA: 'CAN',
        AE: 'ARE'
      };
      const standardizedCountryCode = countryCodeMap[countryCode] || countryCode;

      if (!SUPPORTED_COUNTRIES.includes(standardizedCountryCode)) {
        throw new AppError(`Country ${standardizedCountryCode} not supported`, 400, 'UNSUPPORTED_COUNTRY');
      }

      resolvedLocation = {
        placeId: result.place_id,
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        components: result.address_components,
        countryCode: standardizedCountryCode,
      };
    } else {
      throw new AppError('Invalid location data', 400, 'INVALID_LOCATION');
    }

    logger.logApiEvent('Location resolved', { placeId, address });
    return resolvedLocation;
  } catch (error) {
    logger.logErrorEvent('Failed to resolve location', { error: error.message });
    throw error instanceof AppError ? error : new AppError('Failed to resolve location', 500, 'LOCATION_RESOLUTION_FAILED');
  }
}

async function validateAddress(addressData) {
  try {
    const { countryCode } = addressData;
    if (!countryCode) {
      throw new AppError('Country code is required', 400, 'MISSING_COUNTRY_CODE');
    }
    const standardizedCountryCode = countryCode.length === 2 ? ({
      MW: 'MWI',
      TZ: 'TZA',
      MZ: 'MOZ',
      KE: 'KEN',
      ZM: 'ZMB',
      GH: 'GHA',
      SL: 'SLE',
      CA: 'CAN',
      AE: 'ARE'
    }[countryCode] || countryCode) : countryCode;

    const isValid = SUPPORTED_COUNTRIES.includes(standardizedCountryCode);
    logger.info('Address validation', { countryCode: standardizedCountryCode, isValid });
    return isValid;
  } catch (error) {
    logger.logErrorEvent('Failed to validate address', { error: error.message });
    throw error instanceof AppError ? error : new AppError('Failed to validate address', 400, 'ADDRESS_VALIDATION_FAILED');
  }
}

async function calculateDistance(locations) {
  try {
    if (!Array.isArray(locations) || locations.length < 2) {
      throw new AppError('At least two locations are required', 400, 'INVALID_COORDINATES');
    }
    for (const loc of locations) {
      if (!loc?.lat || !loc?.lng || loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180) {
        throw new AppError('Invalid coordinates', 400, 'INVALID_COORDINATES');
      }
      const resolved = await resolveLocation({ coordinates: { latitude: loc.lat, longitude: loc.lng } });
      if (!SUPPORTED_COUNTRIES.includes(resolved.countryCode)) {
        throw new AppError(`Country ${resolved.countryCode} not supported`, 400, 'UNSUPPORTED_COUNTRY');
      }
    }

    let totalDistance = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      const response = await client.distancematrix({
        params: {
          origins: [`${locations[i].lat},${locations[i].lng}`],
          destinations: [`${locations[i + 1].lat},${locations[i + 1].lng}`],
          mode: 'driving',
          key: config.googleMaps.apiKey,
        },
      });

      const element = response.data.rows[0].elements[0];
      if (element.status !== 'OK') {
        throw new AppError('Failed to calculate distance for segment', 500, 'DISTANCE_CALCULATION_FAILED');
      }
      totalDistance += element.distance.value / 1000; // meters to km
    }

    logger.info('Distance calculated', { locations, totalDistance });
    return totalDistance;
  } catch (error) {
    logger.error('Failed to calculate distance', { error: error.message });
    throw error instanceof AppError ? error : new AppError('Failed to calculate distance', 500, 'DISTANCE_CALCULATION_FAILED');
  }
}

async function getCountryFromCoordinates(lat, lng) {
  try {
    const response = await client.reverseGeocode({
      params: {
        latlng: [lat, lng],
        key: config.googleMaps.apiKey,
      },
    });
    const result = response.data.results[0];
    const countryCode = result.address_components.find((c) => c.types.includes('country'))?.short_name;
    const countryCodeMap = {
      MW: 'MWI',
      TZ: 'TZA',
      MZ: 'MOZ',
      KE: 'KEN',
      ZM: 'ZMB',
      GH: 'GHA',
      SL: 'SLE',
      CA: 'CAN',
      AE: 'ARE'
    };
    const standardizedCountryCode = countryCodeMap[countryCode] || countryCode;
    return standardizedCountryCode;
  } catch (error) {
    logger.error('Failed to get country from coordinates', { error: error.message, lat, lng });
    throw new AppError('Failed to get country from coordinates', 500, 'GEOCODING_FAILED');
  }
}

module.exports = {
  getPlaceDetails,
  getAddressPredictions,
  resolveLocation,
  validateAddress,
  calculateDistance,
  getCountryFromCoordinates
};