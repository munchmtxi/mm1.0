'use strict';

module.exports = {
  LOCATION_UPDATE_FREQUENCY_SECONDS: 10, // Aligned with driverConstants.js
  MAP_SETTINGS: {
    DEFAULT_ZOOM_LEVEL: 15,
    MAX_WAYPOINTS_PER_ROUTE: 10,
  },
  SUPPORTED_MAP_PROVIDERS: {
    MW: 'openstreetmap',
    TZ: 'openstreetmap',
    KE: 'openstreetmap',
    MZ: 'openstreetmap',
    NG: 'google_maps',
    ZA: 'openstreetmap',
    IN: 'google_maps',
    BR: 'google_maps',
  },
  SUPPORTED_CITIES: {
    MW: ['Lilongwe', 'Blantyre', 'Mzuzu'],
    TZ: ['Dar es Salaam', 'Dodoma', 'Arusha'],
    KE: ['Nairobi', 'Mombasa', 'Kisumu'],
    MZ: ['Maputo', 'Beira', 'Nampula'],
    NG: ['Lagos', 'Abuja', 'Kano'],
    ZA: ['Johannesburg', 'Cape Town', 'Durban'],
    IN: ['Mumbai', 'Delhi', 'Bangalore'],
    BR: ['São Paulo', 'Rio de Janeiro', 'Brasília'],
  },
  NOTIFICATION_TYPES: ['LOCATION_UPDATE', 'MAP_CONFIGURED'],
  AUDIT_TYPES: ['SHARE_LOCATION', 'GET_LOCATION', 'CONFIGURE_MAP'],
  EVENT_TYPES: ['LOCATION_UPDATE', 'LOCATION_RETRIEVED', 'MAP_CONFIGURED'],
  ERROR_CODES: [
    'INVALID_LOCATION',
    'DRIVER_NOT_ACTIVE',
    'NO_LOCATION_DATA',
    'LOCATION_OUTDATED',
    'UNSUPPORTED_REGION',
    'LOCATION_UPDATE_FAILED',
  ],
};