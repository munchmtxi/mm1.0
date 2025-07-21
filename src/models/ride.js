'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ride extends Model {
    static associate(models) {
      this.belongsToMany(models.Customer, {
        through: 'RideCustomer',
        foreignKey: 'rideId',
        otherKey: 'customerId',
        as: 'customer',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driverId',
        as: 'driver',
      });
      this.belongsTo(models.Payment, {
        foreignKey: 'paymentId',
        as: 'payment',
      });
      this.belongsTo(models.RouteOptimization, {
        foreignKey: 'routeOptimizationId',
        as: 'routeOptimization',
      });
      this.hasOne(models.Route, {
        foreignKey: 'rideId',
        as: 'route',
      });
      this.hasOne(models.Feedback, {
        foreignKey: 'rideId',
        as: 'feedback',
      });
      this.hasMany(models.Review, {
        foreignKey: 'service_id',
        as: 'reviews',
        constraints: false,
        scope: { service_type: 'ride' },
      });
      this.hasMany(models.Tip, {
        foreignKey: 'ride_id',
        as: 'tips',
      });
    }
  }

  Ride.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'customer_id',
      },
      driverId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'driver_id',
      },
      pickupLocation: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: { notEmpty: { msg: 'Pickup location is required' } },
        field: 'pickup_location',
      },
      dropoffLocation: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: { notEmpty: { msg: 'Dropoff location is required' } },
        field: 'dropoff_location',
      },
      rideType: {
        type: DataTypes.ENUM('STANDARD', 'SHARED', 'PREMIUM', 'SCHEDULED'),
        allowNull: false,
        defaultValue: 'STANDARD',
        validate: {
          isIn: {
            args: [['STANDARD', 'SHARED', 'PREMIUM', 'SCHEDULED']],
            msg: 'Ride type must be one of: STANDARD, SHARED, PREMIUM, SCHEDULED',
          },
        },
        field: 'ride_type',
      },
      status: {
        type: DataTypes.ENUM('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED'),
        allowNull: false,
        defaultValue: 'REQUESTED',
        field: 'status',
      },
      distance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: { args: 0.5, msg: 'Distance must be at least 0.5 km' },
          max: { args: 150, msg: 'Distance cannot exceed 150 km' },
        },
        field: 'distance',
      },
      baseFare: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5.0,
        field: 'base_fare',
      },
      surgeMultiplier: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        defaultValue: 1.0,
        validate: {
          max: { args: 3.0, msg: 'Surge multiplier cannot exceed 3.0' },
        },
        field: 'surge_multiplier',
      },
      currency: {
        type: DataTypes.ENUM('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'MWK', 'TZS', 'KES', 'MZN', 'ZAR', 'INR', 'XAF', 'GHS', 'MXN', 'ERN'),
        allowNull: false,
        defaultValue: 'MWK',
        field: 'currency',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      modelName: 'Ride',
      tableName: 'rides',
      underscored: true,
      paranoid: true,
    }
  );

  return Ride;
};