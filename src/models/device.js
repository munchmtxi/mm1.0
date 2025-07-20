'use strict';
const { Model, DataTypes } = require('sequelize');
const authConstants = require('@constants/common/authConstants');

module.exports = (sequelize) => {
  class Device extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
      this.hasOne(models.AccessibilitySettings, { foreignKey: 'user_id', as: 'accessibilitySettings' });
      this.hasOne(models.PrivacySettings, { foreignKey: 'user_id', as: 'privacySettings' });
    }
  }

  Device.init(
    {
      id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      device_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { notEmpty: { msg: 'Device ID is required' } },
      },
      device_type: {
        type: DataTypes.ENUM('mobile', 'tablet', 'desktop', 'other'),
        allowNull: false,
        validate: { notEmpty: { msg: 'Device type is required' } },
      },
      screen_resolution: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '1920x1080',
        validate: {
          is: {
            args: [/^\d+x\d+$/],
            msg: 'Invalid screen resolution format (e.g., 1920x1080)',
          },
        },
      },
      screen_size: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: 'Physical screen size in inches',
      },
      pixel_ratio: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Device pixel ratio for responsive scaling',
      },
      viewport_size: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '1920x1080',
        validate: {
          is: {
            args: [/^\d+x\d+$/],
            msg: 'Invalid viewport size format (e.g., 1920x1080)',
          },
        },
      },
      location_data: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Latest geolocation data (lat, lng, accuracy, timestamp)',
      },
      location_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last location update',
      },
      location_source: {
        type: DataTypes.ENUM('gps', 'ip', 'manual'),
        allowNull: true,
        comment: 'Source of location data',
      },
      location_permission: {
        type: DataTypes.ENUM('granted', 'denied', 'prompt'),
        allowNull: false,
        defaultValue: 'prompt',
        comment: 'User permission status for location tracking',
      },
      refresh_token: { type: DataTypes.STRING, allowNull: true },
      refresh_token_expires_at: { type: DataTypes.DATE, allowNull: true },
      os: { type: DataTypes.STRING, allowNull: true },
      os_version: { type: DataTypes.STRING, allowNull: true },
      browser: { type: DataTypes.STRING, allowNull: true },
      browser_version: { type: DataTypes.STRING, allowNull: true },
      preferred_language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: authConstants.AUTH_SETTINGS.SUPPORTED_LANGUAGES[0],
        validate: {
          isIn: {
            args: [authConstants.AUTH_SETTINGS.SUPPORTED_LANGUAGES],
            msg: 'Invalid language',
          },
        },
      },
      network_type: { type: DataTypes.ENUM('wifi', 'cellular', 'ethernet', 'other'), allowNull: true },
      network_speed: { type: DataTypes.STRING, allowNull: true, comment: 'e.g., 4g, 5g' },
      connection_quality: {
        type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: true,
      },
      supports_webp: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      preferred_response_format: { type: DataTypes.ENUM('json', 'xml', 'html'), allowNull: false, defaultValue: 'json' },
      max_payload_size: { type: DataTypes.INTEGER, allowNull: true, comment: 'Max response size in bytes' },
      platform: { type: DataTypes.ENUM('ios', 'android', 'web'), allowNull: false },
      platform_version: { type: DataTypes.STRING, allowNull: true },
      is_pwa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      device_memory: { type: DataTypes.FLOAT, allowNull: true, comment: 'Available device memory in GB' },
      hardware_concurrency: { type: DataTypes.INTEGER, allowNull: true, comment: 'Number of logical processors' },
      last_active_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Device',
      tableName: 'devices',
      underscored: true,
      paranoid: true,
      indexes: [
        { unique: true, fields: ['user_id', 'device_id'], name: 'unique_user_device' },
        { fields: ['platform'], name: 'idx_platform' },
        { fields: ['location_updated_at'], name: 'idx_location_updated' },
      ],
      hooks: {
        beforeCreate: async (device) => {
          if (device.location_data && device.location_permission !== 'granted') {
            throw new Error('Location data requires granted permission');
          }
        },
        beforeUpdate: async (device) => {
          if (device.changed('location_data') && device.location_permission !== 'granted') {
            throw new Error('Location data requires granted permission');
          }
          if (device.changed('location_data')) {
            device.location_updated_at = new Date();
          }
        },
      },
    }
  );

  return Device;
};