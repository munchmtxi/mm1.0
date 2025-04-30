'use strict';

const { Model } = require('sequelize');
const { RIDE_TYPES, RIDE_STATUSES } = require('@constants/common/rideConstants');

module.exports = (sequelize, DataTypes) => {
  class Ride extends Model {
    static associate(models) {
      this.belongsTo(models.Customer, {
        foreignKey: 'customer_id',
        as: 'customer',
      });
      this.belongsTo(models.Driver, {
        foreignKey: 'driver_id',
        as: 'driver',
      });
      this.belongsTo(models.Payment, {
        foreignKey: 'payment_id',
        as: 'payment',
      });
      this.belongsTo(models.RouteOptimization, {
        foreignKey: 'route_optimization_id',
        as: 'routeOptimization',
      });
      this.hasOne(models.Route, {
        foreignKey: 'ride_id',
        as: 'route',
      });
      this.belongsTo(models.RideSubscription, {
        foreignKey: 'subscription_id',
        as: 'subscription',
      });
      this.hasMany(models.RideParticipant, {
        foreignKey: 'ride_id',
        as: 'participants',
      });
      this.hasMany(models.SupportTicket, {
        foreignKey: 'ride_id',
        as: 'supportTickets',
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
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      driver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'drivers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: RIDE_STATUSES.REQUESTED,
        validate: {
          isIn: {
            args: [Object.values(RIDE_STATUSES)],
            msg: `Status must be one of: ${Object.values(RIDE_STATUSES).join(', ')}`,
          },
        },
      },
      ride_type: {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: RIDE_TYPES.STANDARD,
        validate: {
          isIn: {
            args: [Object.values(RIDE_TYPES)],
            msg: `Ride type must be one of: ${Object.values(RIDE_TYPES).join(', ')}`,
          },
        },
      },
      pickup_location: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: { notEmpty: { msg: 'Pickup location is required' } },
      },
      dropoff_location: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: { notEmpty: { msg: 'Dropoff location is required' } },
      },
      scheduled_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fare_amount: {
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: { min: { args: [0], msg: 'Fare amount must be positive' } },
      },
      payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'payments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      decline_details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      stops: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      review: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      wait_time: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'Wait time must be non-negative' } },
      },
      demand_factor: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 1.0,
        validate: { min: { args: [1.0], msg: 'Demand factor must be at least 1.0' } },
      },
      dispute_details: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: { alerts: [] },
      },
      driver_snapshot: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
      },
      route_optimization_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'route_optimizations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      route_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'routes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      distance: {
        type: DataTypes.FLOAT,
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
      modelName: 'Ride',
      tableName: 'rides',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['customer_id'] },
        { fields: ['driver_id'] },
        { fields: ['subscription_id'] },
        { fields: ['payment_id'] },
        { fields: ['route_optimization_id'] },
        { fields: ['status'] },
      ],
    }
  );

  return Ride;
};
