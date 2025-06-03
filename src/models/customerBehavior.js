'use strict';

const { Model, DataTypes } = require('sequelize');

/**
 * CustomerBehavior Model
 * Tracks customer interaction patterns (booking, order, ride frequencies).
 * Last Updated: May 18, 2025
 */
module.exports = (sequelize) => {
  class CustomerBehavior extends Model {
    static associate(models) {
      CustomerBehavior.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
      });
    }
  }

  CustomerBehavior.init(
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
        references: {
          model: 'users',
          key: 'id',
        },
      },
      bookingFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Booking frequency cannot be negative' },
        },
      },
      orderFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Order frequency cannot be negative' },
        },
      },
      rideFrequency: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Ride frequency cannot be negative' },
        },
      },
      lastUpdated: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
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
    },
    {
      sequelize,
      modelName: 'CustomerBehavior',
      tableName: 'customer_behaviors',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { unique: true, fields: ['user_id'] },
      ],
    }
  );

  return CustomerBehavior;
};