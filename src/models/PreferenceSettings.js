// PreferenceSettings.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class PreferenceSettings extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  PreferenceSettings.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'customer', // From Roles.js allowed roles
        validate: {
          isIn: {
            args: [['admin', 'customer', 'merchant', 'staff', 'driver']],
            msg: 'Invalid user type',
          },
        },
      },
      dietary_preferences: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        validate: {
          isIn: [['vegetarian', 'vegan', 'gluten_free', 'nut_free', 'dairy_free', 'halal', 'kosher', 'low_carb', 'organic']],
        }, // From munchConstants/mtablesConstants/meventsConstants.ORDER_SETTINGS.ALLOWED_DIETARY_FILTERS
      },
      notification_preferences: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          email: true,
          sms: true,
          push: true,
          whatsapp: true,
          telegram: true,
          facebook: false,
          instagram: false,
          x: false,
          snapchat: false,
          tiktok: false,
        }, // From socialConstants.SOCIAL_SETTINGS.GROUP_CHAT_SETTINGS.SUPPORTED_PLATFORMS
        comment: 'User preferences for notification channels',
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'USD', // From munchConstants/mtxiConstants/mticketsConstants/mtablesConstants/mparkConstants/mstaysConstants.DEFAULT_CURRENCY
        validate: {
          isIn: [['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN']],
        }, // From SUPPORTED_CURRENCIES
      },
      ai_recommendations: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: ['personalized_menu', 'dietary_suggestions', 'trending_items'],
        validate: {
          isIn: [
            [
              'personalized_menu', 'dietary_suggestions', 'trending_items', // From munchConstants.ORDER_CONSTANTS
              'ticket_recommendations', // From mticketsConstants.INTEGRATION_CONFIG
              'personalized_recommendations', 'local_experience_suggestions', // From mstaysConstants.INTEGRATION_CONFIG
              'venue_suggestions', // From meventsConstants.EVENT_CONFIG
            ],
          ],
        },
      },
      seating_preferences: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: ['no_preference'],
        validate: {
          isIn: [
            [
              'no_preference', 'indoor', 'outdoor', 'rooftop', 'balcony', 'window',
              'booth', 'high_top', 'bar', 'lounge', 'private', 'communal',
            ],
          ], // From mtablesConstants.TABLE_MANAGEMENT.SEATING_PREFERENCES
        },
        comment: 'Preferred seating types for dining',
      },
      accommodation_preferences: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        validate: {
          isIn: [
            [
              'standard', 'suite', 'apartment', 'villa', 'hostel', 'eco_lodge',
              'luxury', 'family', 'accessible', 'wifi', 'air_conditioning',
              'parking', 'pool', 'gym', 'pet_friendly', 'accessible_features',
            ],
          ], // From mstaysConstants.ROOM_CONFIG.ROOM_TYPES and selected AMENITIES
        },
        comment: 'Preferred accommodation types and amenities',
      },
      parking_preferences: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        validate: {
          isIn: [
            [
              'standard', 'accessible', 'ev_charging', 'oversized', 'premium', 'private',
              'motorbike', 'cctv', 'guarded', 'gated', 'lighting', 'patrolled', 'biometric',
            ],
          ], // From mparkConstants.SPACE_CONFIG.SPACE_TYPES and SECURITY_FEATURES
        },
        comment: 'Preferred parking space types and security features',
      },
      event_preferences: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
        validate: {
          isIn: [
            [
              'birthday', 'anniversary', 'corporate', 'social', 'wedding', 'conference',
              'baby_shower', 'graduation', 'festival', 'charity', 'concert', 'sports', 'theater', 'other',
            ],
          ], // From meventsConstants.EVENT_OCCASIONS
        },
        comment: 'Preferred event types',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'PreferenceSettings',
      tableName: 'preference_settings',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id'] }],
    }
  );

  return PreferenceSettings;
};