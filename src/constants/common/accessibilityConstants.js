'use strict';

module.exports = {
  ACCESSIBILITY_CONSTANTS: {
    SUPPORTED_FEATURES: [
      'screen_reader',
      'adjustable_fonts',
      'high_contrast',
      'voice_commands',
      'braille_support',
      'accessible_seating',
      'color_blind_mode',
      'reduced_motion',
      'text_to_speech',
      'keyboard_navigation'
    ],
    FONT_SIZE_RANGE: { min: 10, max: 28 },
    SUPPORTED_LANGUAGES: [
      'en', 'es', 'fr', 'de', 'it', 'sw', 'ny', 'pt', 'hi', 'zu', 'xh', 'am', 'ti'
    ],
    DEFAULT_LANGUAGE: 'en',
    THEMES: ['light', 'dark', 'system'],
    COLOR_BLIND_MODES: ['none', 'protanopia', 'deuteranopia', 'tritanopia'],
    ALLOWED_DIETARY_FILTERS: [
      'vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic'
    ]
  }
};