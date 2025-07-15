'use strict';

module.exports = {
  DEFAULT_CURRENCY: 'USD',
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'],
  COUNTRY_CURRENCY_MAP: {
    US: 'USD', GB: 'GBP', EU: 'EUR', CA: 'CAD', AU: 'AUD', MW: 'MWK', TZ: 'TZS', KE: 'KES', MZ: 'MZN',
    ZA: 'ZAR', IN: 'INR', CM: 'XAF', GH: 'GHS', MX: 'MXN', ER: 'ERN'
  },
  SUPPORTED_COUNTRIES: ['US', 'GB', 'EU', 'CA', 'AU', 'MW', 'TZ', 'KE', 'MZ', 'ZA', 'IN', 'CM', 'GH', 'MX', 'ER'],
  DEFAULT_LANGUAGE: 'en',
  SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'],
  SUPPORTED_CITIES: {
    US: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco'],
    GB: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh'],
    EU: ['Berlin', 'Paris', 'Amsterdam', 'Rome', 'Madrid'],
    CA: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
    AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
    MW: ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba'],
    TZ: ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza'],
    KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Eldoret'],
    MZ: ['Maputo', 'Beira', 'Nampula', 'Matola'],
    ZA: ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
    IN: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad'],
    CM: ['Douala', 'Yaoundé'],
    GH: ['Accra', 'Kumasi'],
    MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla'],
    ER: ['Asmara', 'Keren', 'Massawa']
  },
  DEFAULT_TIMEZONE: 'UTC',
  SUPPORTED_MAP_PROVIDERS: {
    US: 'google_maps', GB: 'google_maps', EU: 'openstreetmap', CA: 'google_maps', AU: 'google_maps',
    MW: 'openstreetmap', TZ: 'openstreetmap', KE: 'openstreetmap', MZ: 'openstreetmap',
    ZA: 'openstreetmap', IN: 'google_maps', CM: 'openstreetmap', GH: 'openstreetmap',
    MX: 'google_maps', ER: 'openstreetmap'
  },
  LOCALIZATION_SETTINGS: {
    DATE_FORMATS: {
      US: 'MM/DD/YYYY', GB: 'DD/MM/YYYY', EU: 'DD/MM/YYYY', CA: 'MM/DD/YYYY', AU: 'DD/MM/YYYY',
      MW: 'DD/MM/YYYY', TZ: 'DD/MM/YYYY', KE: 'DD/MM/YYYY', MZ: 'DD/MM/YYYY', ZA: 'DD/MM/YYYY',
      IN: 'DD/MM/YYYY', CM: 'DD/MM/YYYY', GH: 'DD/MM/YYYY', MX: 'DD/MM/YYYY', ER: 'DD/MM/YYYY'
    },
    TIME_FORMATS: {
      US: '12h', GB: '24h', EU: '24h', CA: '12h', AU: '24h',
      MW: '24h', TZ: '24h', KE: '24h', MZ: '24h', ZA: '24h',
      IN: '24h', CM: '24h', GH: '24h', MX: '24h', ER: '24h'
    },
    NUMBER_FORMATS: {
      DECIMAL_SEPARATOR: { US: '.', CA: '.', AU: '.', others: ',' },
      THOUSAND_SEPARATOR: { US: ',', CA: ',', AU: ',', others: '.' }
    },
    LANGUAGE_FALLBACK: 'en',
    RTL_LANGUAGES: ['am', 'ti'],
    AI_LOCALIZATION: {
      AUTO_TRANSLATE: true,
      SUGGESTED_LANGUAGES: true,
      DYNAMIC_CURRENCY_CONVERSION: true
    }
  }
};