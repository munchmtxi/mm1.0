'use strict';
module.exports = {
  SETTINGS_EVENTS: {
    COUNTRY_UPDATED: {
      event: 'settings:country_updated',
      description: 'Emitted when country is updated.',
      payload: ['driverId', 'country'],
    },
    LANGUAGE_UPDATED: {
      event: 'settings:language_updated',
      description: 'Emitted when language is updated.',
      payload: ['driverId', 'language'],
    },
    ACCESSIBILITY_UPDATED: {
      event: 'settings:accessibility_updated',
      description: 'Emitted when accessibility settings are updated.',
      payload: ['driverId', 'screenReaderEnabled', 'fontSize'],
    },
    PRIVACY_UPDATED: {
      event: 'settings:privacy_updated',
      description: 'Emitted when privacy settings are updated.',
      payload: ['driverId', 'preferences'],
    },
  },
};