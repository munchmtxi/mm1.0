'use strict';
const { Model } = require('sequelize');
const driverConstants = require('@constants/driverConstants');

module.exports = (sequelize, DataTypes) => {
  class DriverSafetyIncident extends Model {
    static associate(models) {
      this.belongsTo(models.Driver, { foreignKey: 'driver_id', as: 'driver' });
      this.belongsTo(models.Ride, { foreignKey: 'ride_id', as: 'ride' });
      this.belongsTo(models.Order, { foreignKey: 'delivery_order_id', as: 'deliveryOrder' });
    }
  }

  DriverSafetyIncident.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      ride_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'rides', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      delivery_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      incident_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      incident_type: {
        type: DataTypes.ENUM(
          'ACCIDENT',
          'HARASSMENT',
          'VEHICLE_ISSUE',
          'UNSAFE_SITUATION',
          'SOS',
          'DISCREET_ALERT',
          'OTHER'
        ),
        allowNull: false,
        validate: {
          isIn: {
            args: [driverConstants.SAFETY_CONSTANTS.INCIDENT_TYPES],
            msg: 'Invalid incident type',
          },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: { args: [0, 1000], msg: 'Description must be 1000 characters or less' },
        },
      },
      location: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Coordinates or address of the incident (e.g., { lat, lng })',
      },
      status: {
        type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      resolution_details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DriverSafetyIncident',
      tableName: 'driver_safety_incidents',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['driver_id'] },
        { fields: ['ride_id'] },
        { fields: ['delivery_order_id'] },
        { fields: ['incident_number'], unique: true },
        { fields: ['incident_type'] },
        { fields: ['status'] },
      ],
      validate: {
        oneServiceReference() {
          const refs = [this.ride_id, this.delivery_order_id].filter((id) => id != null).length;
          if (refs > 1) {
            throw new Error('Incident must be associated with only one of ride or delivery order.');
          }
        },
      },
    }
  );

  return DriverSafetyIncident;
};