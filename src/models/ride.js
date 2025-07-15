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
        allowNull: true, // Changed to nullable to match service logic
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
        type: DataTypes.STRING(255),
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
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: 'REQUESTED',
        validate: {
          isIn: {
            args: [['REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DELAYED']],
            msg: 'Status must be one of: REQUESTED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED, DELAYED',
          },
        },
        field: 'status',
      },
      scheduledTime: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'scheduled_time',
      },
      paymentId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'payments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'payment_id',
      },
      routeOptimizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'route_optimizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'route_optimization_id',
      },
      routeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'routes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        field: 'route_id',
      },
      reference: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'reference',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at',
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at',
      },
      deleted_at: {
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
      indexes: [
        { fields: ['customer_id'] },
        { fields: ['driver_id'] },
        { fields: ['payment_id'] },
        { fields: ['route_optimization_id'] },
        { fields: ['status'] },
        { fields: ['reference'] },
      ],
    }
  );

  return Ride;
};