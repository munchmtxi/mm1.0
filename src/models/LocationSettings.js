// LocationSettings.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class LocationSettings extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  LocationSettings.init(
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
      location_sharing: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Allow sharing location with services',
      },
      geofence_notifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Receive notifications when entering/leaving geofenced areas',
      },
      default_location: {
        type: DataTypes.GEOMETRY('POINT'),
        allowNull: true,
        comment: 'Default user location for services',
      },
      real_time_tracking: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // From munchConstants.DELIVERY_CONSTANTS.DELIVERY_SETTINGS.REAL_TIME_TRACKING
        comment: 'Enable real-time location tracking for services like mtxi and munch',
      },
      map_provider: {
        type: DataTypes.ENUM('google_maps', 'openstreetmap'), // From munchConstants/mtxiConstants/mparkConstants.SUPPORTED_MAP_PROVIDERS
        allowNull: false,
        defaultValue: 'google_maps',
        validate: {
          isIn: [['google_maps', 'openstreetmap']],
        },
        comment: 'Preferred map provider for navigation',
      },
      preferred_city: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [
            [
              'New York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'San Francisco',
              'London', 'Manchester', 'Birmingham', 'Glasgow', 'Edinburgh',
              'Berlin', 'Paris', 'Amsterdam', 'Rome', 'Madrid',
              'Toronto', 'Vancouver', 'Montreal', 'Calgary',
              'Sydney', 'Melbourne', 'Brisbane', 'Perth',
              'Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba',
              'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza',
              'Nairobi', 'Mombasa', 'Kisumu', 'Eldoret',
              'Maputo', 'Beira', 'Nampula', 'Matola',
              'Johannesburg', 'Cape Town', 'Durban', 'Pretoria',
              'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad',
              'Douala', 'Yaoundé', 'Accra', 'Kumasi',
              'Mexico City', 'Guadalajara', 'Monterrey', 'Puebla',
              'Asmara', 'Keren', 'Massawa',
            ],
          ], // From SUPPORTED_CITIES across constants
        },
        comment: 'Preferred city for services',
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
      modelName: 'LocationSettings',
      tableName: 'location_settings',
      underscored: true,
      paranoid: true,
      timestamps: true,
      indexes: [{ unique: true, fields: ['user_id'] }],
    }
  );

  return LocationSettings;
};