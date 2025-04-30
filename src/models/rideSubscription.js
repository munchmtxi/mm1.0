'use strict';
const { Model } = require('sequelize');
const { DAYS_OF_WEEK } = require('@constants/common/subscriptionConstants'); // adjust path if needed

module.exports = (sequelize, DataTypes) => {
  class RideSubscription extends Model {
    static associate(models) {
      this.belongsTo(models.Subscription, { foreignKey: 'subscription_id', as: 'subscription' });
      this.belongsTo(models.Customer, { foreignKey: 'customer_id', as: 'customer' });
      this.hasMany(models.Ride, {
        foreignKey: 'subscription_id',
        sourceKey: 'subscription_id',
        as: 'rides',
      });
    }
  }

  RideSubscription.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'subscriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'customers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rides_remaining: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'Rides remaining cannot be negative' } },
      },
      day_of_week: {
        type: DataTypes.ENUM(...DAYS_OF_WEEK),
        allowNull: true,
      },
      time: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          matches: {
            args: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/],
            msg: 'Time must be in HH:MM format',
          },
        },
      },
      pickup_location: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          isValidLocation(value) {
            if (value && (typeof value.latitude !== 'number' || typeof value.longitude !== 'number')) {
              throw new Error('Pickup location must have latitude and longitude');
            }
            if (value && (value.latitude < -90 || value.latitude > 90)) {
              throw new Error('Pickup latitude must be between -90 and 90');
            }
            if (value && (value.longitude < -180 || value.longitude > 180)) {
              throw new Error('Pickup longitude must be between -180 and 180');
            }
          },
        },
      },
      dropoff_location: {
        type: DataTypes.JSONB,
        allowNull: true,
        validate: {
          isValidLocation(value) {
            if (value && (typeof value.latitude !== 'number' || typeof value.longitude !== 'number')) {
              throw new Error('Dropoff location must have latitude and longitude');
            }
            if (value && (value.latitude < -90 || value.latitude > 90)) {
              throw new Error('Dropoff latitude must be between -90 and 90');
            }
            if (value && (value.longitude < -180 || value.longitude > 180)) {
              throw new Error('Dropoff longitude must be between -180 and 180');
            }
          },
        },
      },
      ride_type: {
        type: DataTypes.ENUM('STANDARD', 'PREMIUM'),
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
      modelName: 'RideSubscription',
      tableName: 'ride_subscriptions',
      underscored: true,
      paranoid: true,
      indexes: [
        { fields: ['subscription_id'] },
        { fields: ['customer_id'] },
      ],
    }
  );

  return RideSubscription;
};
